# Query Shape Detection
[![npm version](https://badge.fury.io/js/query-shape-detection.svg)](https://www.npmjs.com/package/query-shape-detection)


A nodejs library to calculate the containment between [SPARQL queries](https://www.w3.org/TR/sparql11-query/) and [RDF data shapes](https://www.w3.org/groups/wg/data-shapes/) at the star pattern level.

## Installation
```sh
yarn add query-shape-detection
```

## Dependencies
Node v20 or higher

## Example code

```ts
import {
  ContainmentResult,
  generateQuery,
  shapeFromQuads,
  solveShapeQueryContainment,
} from 'query-shape-detection';

import type {
  IResult,
  IQuery,
  IShape,
} from 'query-shape-detection';
import { translate } from 'sparqlalgebrajs';
import * as ShexParser from '@shexjs/parser';
import { JsonLdParser } from 'jsonld-streaming-parser';
import * as SHEX_CONTEXT from './shex_context.json'; // you need to provide this JSON from https://www.w3.org/ns/shex.jsonld

const rawQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
      SELECT ?personId ?personFirstName ?personLastName ?commentCreationDate ?commentId ?commentContent WHERE {
        VALUES ?type {
          snvoc:Comment
          snvoc:Post
        }
        <http://localhost:3000/pods/00000002199023256816/profile/card#me> rdf:type snvoc:Person.
        ?message snvoc:hasCreator <http://localhost:3000/pods/00000002199023256816/profile/card#me>;
          rdf:type ?type.
        ?comment rdf:type snvoc:Comment;
          snvoc:replyOf ?message;
          snvoc:creationDate ?commentCreationDate;
          snvoc:id ?commentId;
          snvoc:content ?commentContent;
          snvoc:hasCreator ?person.
        ?person snvoc:id ?personId;
          snvoc:firstName ?personFirstName;
          snvoc:lastName ?personLastName.
      }
      ORDER BY DESC (?commentCreationDate) (?commentId)
      LIMIT 20
`;

const query = generateQuery(translate(rawQuery));

// The shape may come already as an array of quad or a quad stream. I am presenting a contained example.
const shapeShexc = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX ldbcvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
PREFIX schema: <http://www.w3.org/2000/01/rdf-schema#>

<http://localhost:3000/pods/00000000000000000065/comments_shape#Comment> CLOSED {
    a ldbcvoc:Comment?;
    ldbcvoc:id xsd:long ;
    ldbcvoc:creationDate xsd:dateTime ;
    ldbcvoc:locationIP xsd:string  ;
    ldbcvoc:browserUsed xsd:string ;
    ldbcvoc:content xsd:string?;
    ldbcvoc:lenght xsd:int ;
    ldbcvoc:hasTag IRI *;
    (
        ldbcvoc:replyOf @<http://localhost:3000/pods/00000000000000000065/comments_shape#Post> *;
        |
        ldbcvoc:replyOf @<http://localhost:3000/pods/00000000000000000065/comments_shape#Comment> *;
    );
    ldbcvoc:isLocatedIn IRI ;
    ldbcvoc:hasCreator @<http://localhost:3000/pods/00000000000000000065/comments_shape#Profile> ;
}
`;
const shapeIRI = "http://localhost:3000/pods/00000000000000000065/comments_shape#Comment";
const shexParser = ShexParser.construct(shapeIRI);

const shapeJSONLD = shexParser.parse(shapeShexc);
const stringShapeJsonLD = JSON.stringify(shapeJSONLD);
const quads: RDF.Quad[] = [];

const shapeQuadPromise = new Promise((resolve, reject) => {
      // The jsonLD is not valid without the context field and the library doesn't include it
      // because a ShExJ MAY contain a @context field
      // https://shex.io/shex-semantics/#shexj
      const jsonldParser = new JsonLdParser({
        streamingProfile: false,
        context: SHEX_CONTEXT // you have to provide a JSON of the context,
        skipContextValidation: true,
      });
      jsonldParser
        .on('data', async(quad: RDF.Quad) => {
          quads.push(quad);
        })
        .on('error',(error: any) => {
          reject(error);
        })
        .on('end', async() => {
          resolve(quads);
        });

      jsonldParser.write(stringShapeJsonLD);
      jsonldParser.end();
    });
// shapeQuadPromise can be a quad stream or a array of quad 
const commentShape = await shapeFromQuads(await shapeQuadPromise, shapeIRI);


const resultsReport: IResult = solveShapeQueryContainment({
        query: query,
        shapes,
      });

// resultsReport provide an object with information about the containement.
// The containement is calculated by star patterns.


/**
export interface IResult {
  // URL from the object of triples (s, p, o) that are not bound by a shape
  conditionalLink: IConditionalLink[];
  // The documents associated with a shape that can be followed
  visitShapeBoundedResource: Map<ShapeName, boolean>;
  // The type of containment of each star patterns with there associated shapes
  // This is the general information about the containment
  starPatternsContainment: Map<StarPatternName, IContainmentResult>;
}
*/

/**
export type IContainmentResult = Readonly<{
  // The type of containement
  result: ContainmentResult;
  
   // The shape iri associated with the containement
   // Will be undefined if the the star pattern has no alignment with any shape
   // The size of the array will be greater than one if it is contained by dependence
  target?: string[];
  
   // If the result is an alignment then we record the shape
   // that have a binding with RDF class
  bindingByRdfClass?: string[];
}>;

export enum ContainmentResult {
  // Is contained
  CONTAIN,
  // Has at least one binding
  ALIGNED,
  // Is a dependency of a contained star pattern
  DEPEND,
  // Has no binding
  REJECTED,
}
 
*/
```

## Current limitation
- Support only ShEx
- Known bug for some complex property path
- No support for MINUS statement
- No support for filter expression
