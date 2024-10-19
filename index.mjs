import { QueryEngineFactory } from "@comunica/query-sparql-link-traversal-solid";
import { LoggerPretty } from '@comunica/logger-pretty';
import Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import streamToString from 'stream-to-string';
import { Command } from 'commander';

const COMUNICA_HDT_IMAGE = "comunica/query-sparql-hdt:latest";
const docker = new Docker();

const program = new Command();
program
  .name('evaluation')
  .description('CLI program to run a SPARQL query using Comunica for the context of benchmarking')
  .version('0.0.0')

  .requiredOption('-q, --query <string>', 'query to execute')
  
  .option('-c, --config <string>', 'File path of the config')
  .option('-t, --timeout <number>', 'Timeout of the query in second', 120 * 1000)
  .option('-hdt, --pathFragmentation <string>', 'The file path of the dataset for querying over HDT. When not specified, it will execute an LTQP query.')

  .parse(process.argv);

const options = program.opts();
const config = options.config;
const query = options.query;
const timeout = Number(options.timeout) * 1000;
const pathFragmentation = options.pathFragmentation; 

try {
  let resp;
  if(pathFragmentation !== undefined){
    resp = await executeQuery(config, query, timeout);
  }else{
    resp = await executeHdtQuery(query, timeout)
  }
  console.log("response start");
  console.log(JSON.stringify(resp));
  console.log("response end");
} catch (err) {
  console.log("runner error");
  console.log(err);
}

async function getImage() {
  await new Promise((resolve, reject) => docker.pull(COMUNICA_HDT_IMAGE, {}, (error, result) => {
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
    resolve(
      {
        results: "TIMEOUT",
        execution_time: `TIMEOUT ${timeout}`
      }
    );
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
      Binds: [`${resolve(pathFragmentation)}:/data:rw`],
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
    resolve(
      {
        results: passThroughErrToString,
      }
    );
    return;
  }
  resolve(
    {
      results: passThroughToString,
    }
  );
  
}

async function executeQuery(configPath, query, timeout) {
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
    const start = new Date().getTime();

    try {
      bindingsStream = await engine.queryBindings(query, {
        lenient: true,
        log: new LoggerPretty({ level: 'trace' }),
      });
    } catch (err) {
      reject(err);
    }


    bindingsStream.on('data', (binding) => {
      const result = JSON.parse(binding.toString());
      const arrival = new Date().getTime();
      results.push(
        {
          ...result,
          arrival_time: arrival- start
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
      const end = new Date().getTime();
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