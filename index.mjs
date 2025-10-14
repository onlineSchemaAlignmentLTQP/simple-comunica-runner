import { QueryEngineFactory } from "@comunica/query-sparql-link-traversal-solid";
import { LoggerBunyan, BunyanStreamProviderStdout } from "@comunica/logger-bunyan";
import { LoggerVoid } from '@comunica/logger-void';
import Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import streamToString from 'stream-to-string';
import { Command } from 'commander';
import * as path from 'node:path';
import { rdfParser } from "rdf-parse";
import { readFile } from "node:fs/promises";
import Streamify from "streamify-string";

const COMUNICA_HDT_IMAGE = "comunica/query-sparql-hdt:latest";
const REGEX_SUMMARY = /(TOTAL),([+-]?[0-9]*[.]?[0-9]+),([0-9]+)/;
const REGEX_RESULT = /(\d+),(\d+\.\d*),(\d)/;

const docker = new Docker();

const program = new Command();
program
  .name('evaluation')
  .description('CLI program to run a SPARQL query using Comunica for the context of benchmarking')
  .version('0.0.0')

  .requiredOption('-q, --query <string>', 'query to execute')

  .option('-w, --warmup <number>', 'number of warm up')
  .option('-wc, --warmupSource <string>', 'the source for the warm up rounds', "http://localhost:3000/dbpedia.org/resource/Aachen")
  .option('-s, --sources <string>', undefined)
  .option('-c, --config <string>', 'File path of the config')
  .option('-t, --timeout <number>', 'Timeout of the query in second', 120 * 1000)
  .option('-r, --rules <string>', 'path of a rule KG', undefined)
  .option('-hdt, --pathFragmentationFolder <string>', 'The path of the dataset folder for querying over HDT. When not specified, it will execute an LTQP query.')

  .parse(process.argv);

const options = program.opts();
const config = options.config;
const query = options.query;
const timeout = Number(options.timeout) * 1000;
const pathFragmentation = options.pathFragmentationFolder;
const warmup = options.warmup;
const warmupSource = options.warmupSource;
const sources = options.sources !== undefined ? JSON.parse(options.sources) : undefined;
const rulePath = options.rules;
const rules = [];

if(rulePath!==undefined){
  const stringKg = await readFile(rulePath,'utf-8');
  const streamKg = Streamify(stringKg);
  await new Promise((resolve, reject)=>{
    rdfParser.parse(streamKg, { contentType: 'text/turtle'})
    .on('data', (quad) => {
      rules.push(quad);
    })
    .on('error', (error) => {
      reject(error);
    })
    .on('end', () => {
      resolve();
    });
  });
  
}

const WARM_UP_QUERY = 'SELECT * WHERE {?s ?p ?o} LIMIT 1';


try {
  let resp;
  if (pathFragmentation !== undefined) {
    resp = await executeHdtQuery(query, timeout)
  } else {
    if (warmup !== undefined) {
      for (let i = 0; i < warmup; i++) {
        await executeQuery(config, WARM_UP_QUERY, timeout, warmupSource);
      }
    }
    resp = await executeQuery(config, query, timeout, undefined, sources);
  }
  console.log("response start");
  console.log(JSON.stringify(resp));
  console.log("response end");
} catch (err) {
  console.log("runner error");
  console.log(err);
}

async function getImage() {
  function onProgress(event) {
    console.log(event);
  }
  return new Promise((resolve, reject) => docker.pull(COMUNICA_HDT_IMAGE, {}, (error, result) => {
    if (error) {
      reject(error);
    }
    docker.modem.followProgress(result, error => error ? reject(error) : resolve(), onProgress);
  }));
}

async function executeHdtQuery(query, timeout) {
  await getImage();

  const timeoutID = setTimeout(() => {
    console.log('Query timeout');
    return {
      results: "TIMEOUT",
      execution_time: `TIMEOUT ${timeout}`
    };
  }, timeout);

  const cmd = [
    'hdt@/data/datadump.hdt',
    '-q',
    query,
    '-t',
    'stats'
  ];
  const createOptions = {
    Tty: false,
    HostConfig: {
      AutoRemove: true,
      Binds: [`${path.resolve(pathFragmentation)}:/data:rw`],
    },
    Entrypoint: ["node", "--max-old-space-size=16000", "./bin/query.js"]
  };
  const passThrough = new PassThrough();
  const passThroughErr = new PassThrough();
  const passThroughToString = streamToString(passThrough);
  const passThroughErrToString = streamToString(passThroughErr);

  const cmdResult = await docker.run(
    COMUNICA_HDT_IMAGE,
    cmd,
    [passThrough, passThroughErr],
    createOptions,
  )
  clearTimeout(timeoutID);

  if (cmdResult[0].StatusCode) {
    console.log(passThroughErrToString);
    return {
      results: await passThroughErrToString,
    }

  }
  return parseStatResult(await passThroughToString);
}

function parseStatResult(result) {
  const resultArray = result.split("\n");
  const results = [];
  let executionTime;

  for (const result of resultArray) {
    if (REGEX_RESULT.test(result)) {
      let tag = (result).match(REGEX_RESULT);
      results.push({
        _arrival_time: Number(tag[2])
      });
    }
    if (REGEX_SUMMARY.test(result)) {
      let tag = (result).match(REGEX_SUMMARY);
      executionTime = Number(tag[2]);
    }
  }
  return {
    results,
    execution_time: executionTime
  };
}

async function executeQuery(configPath, query, timeout, warmupSource = undefined, sources = undefined) {
  return new Promise(async (resolve, reject) => {
    const engine = await new QueryEngineFactory().create({ configPath });
    const results = [];
    const timeoutID = setTimeout(() => {
      console.log('Query timeout');
      resolve(
        {
          results: "TIMEOUT",
          execution_time: `TIMEOUT ${timeout}`
        }
      );
    }, timeout);
    let bindingsStream;
    const start = performance.now();

    let engineSources = [];
    if (warmupSource !== undefined) {
      engineSources = [warmupSource];
    }
    if (sources !== undefined) {
      engineSources = sources;
    }

    try {
      const streamProvider = new BunyanStreamProviderStdout({ level: 'info' });
      const loggerParams = {
        name: 'comunica',
        level: 'info',
        streamProviders: [streamProvider],
      };
      const logger = new LoggerBunyan(loggerParams);

      bindingsStream = await engine.queryBindings(query, {
        lenient: true,
        "@comunica/actor-context-preprocess-query-source-reasoning:rules": new Map([
          ["*", rules]
        ]),
        log: warmupSource === undefined ? logger : new LoggerVoid(),
        sources: engineSources
      });
    } catch (err) {
      reject(err);
    }

    bindingsStream.on('data', (binding) => {
      const result = JSON.parse(binding.toString());
      const arrival = performance.now();
      results.push(
        {
          ...result,
          _arrival_time: arrival - start
        }
      );
    });

    bindingsStream.on('error', (err) => {
      console.error(err);
      clearTimeout(timeoutID);
      resolve(
        {
          results: err,
          execution_time: undefined
        }
      );
    });

    bindingsStream.on('end', () => {
      const end = performance.now();
      clearTimeout(timeoutID);
      resolve(
        {
          results,
          execution_time: end - start
        }
      );
    });
  })
}