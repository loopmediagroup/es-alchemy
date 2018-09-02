[![Build Status](https://circleci.com/gh/loopmediagroup/es-alchemy.png?style=shield)](https://circleci.com/gh/loopmediagroup/es-alchemy)
[![Test Coverage](https://img.shields.io/coveralls/loopmediagroup/es-alchemy/master.svg)](https://coveralls.io/github/loopmediagroup/es-alchemy?branch=master)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=loopmediagroup/es-alchemy)](https://dependabot.com)
[![Dependencies](https://david-dm.org/loopmediagroup/es-alchemy/status.svg)](https://david-dm.org/loopmediagroup/es-alchemy)
[![NPM](https://img.shields.io/npm/v/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)
[![Downloads](https://img.shields.io/npm/dt/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)
[![Semantic-Release](https://github.com/simlu/js-gardener/blob/master/assets/icons/semver.svg)](https://github.com/semantic-release/semantic-release)
[![Gardener](https://github.com/simlu/js-gardener/blob/master/assets/badge.svg)](https://github.com/simlu/js-gardener)

# EsAlchemy

Simplification of Elasticsearch interactions

## Install

```bash
npm i --save es-alchemy
```

## Tests

All tests need to be run in docker container. Start with:

```bash
. manage.sh
```

Test elasticsearch works correctly with

```bash
curl http://elasticsearch:9200/_cluster/health
```

Run all tests with

```bash
npm t
```

## Setup

Outline of how [ES-Alchemy](https://github.com/loopmediagroup/es-alchemy) can be used, step by step:

- Define data models
- Define indices based on the data models
- Generate mappings from indices and then create them in Elasticsearch
- Obtain input data as defined in the source mappings of index and remap it
- Insert remapped data into Elasticsearch
- Build a query using the ES-Alchemy query syntax
- Run query against Elasticsearch

### Constructor

#### protocol

Type: `string`<br>
Default: `http`

The protocol for connecting to Elasticsearch. Can be `http` or `https`.

#### endpoint

Type: `string`<br>
Default: `elasticsearch:9200`

The endpoint for connecting to Elasticsearch. Common values include `localhost:9200`.

#### aws

Type: `object`<br>
Default: `{}`

Allow connection to AWS Elasticsearch instance by passing 
in object containing `accessKeyId` and `secretAccessKey`.

### Api

Available commands

#### model

- `register(name: String, definition: Object)` - register a model with ES-Alchemy

#### index

- `register(name: String, definitions: Object)` - register an index with ES-Alchemy
- `list()` - list all indices registered with ES-Alchemy
- `getMapping(name: String)` - get the mapping for Elasticsearch for this index
- `getFields(name: String)` - get all fields (including nested fields) for this index

#### data

- `remap(name: String, source: Object)` - remap source object to ingestible object, see details below

#### query

- `build(name: String?, options: Object)` - build a query, index is optional and can be passed as null, see below for options details

#### rest

Interacting with the rest api of Elasticsearch

- `call(mothod: String, name: String, options: Object)` - make direct API call to Elasticsearch
- `mapping.create(name: String)` - create mapping on Elasticsearch
- `mapping.delete(name: String)` - delete mapping from Elasticsearch
- `mapping.get(name: String)` - get mapping details from Elasticsearch
- `mapping.recreate(name: String)` - recreate mapping on Elasticsearch
- `data.count(name: String)` - get number of indexed elements from Elasticsearch
- `data.query(name: String, filter: Object, options: Object)` - query for data in Elasticsearch. Use raw flag to obtain raw result from Elasticsearch.
- `data.refresh(name: String)` - refresh Elasticsearch index, useful e.g. when testing
- `data.update(name: String, options: Object)` - insert, update or delete objects in Elasticsearch

### Model and Index Definitions

#### Models

Models define the fields and their types. They restrict how an index can be put together.

It is recommended that you define a folder `models` that contains a json file for each model. An example can be
found in the [test folder](test/models).

Fields that can be used and how they get mapped in Elasticsearch can 
be found [here](src/resources/field-definitions.json).

#### Indices

Indices define how data, models and elasticsearch mappings all tie together.

It is recommended that you define a folder `indices` that contains a json file for each index. An example can be
found in the [test folder](test/indices).

Each index is defined as a nested structure of nodes. 
Nodes are defined recursively and each node has the following fields:

##### model

Type: `string`<br>
Required.

Defines the model that is used for the node.

To indicate that an array of models should be used for this node, append `[]` to the model name.

##### fields

Type: `Array`<br>
Required.

Contains the fields of the corresponding model that should be used for this node. 
Only fields defined in the model definition can be used.

##### sources

Type: `Array`<br>
Default: `[""]`

Defines the relative sources for data ingestion. How exactly this works will be explained below
when data ingestion and remapping is explained.

##### nested

Type: `Object`<br>
Default: `{}`

Defines all children of the node as an Object. Keys indicate the 
relationship names and the values define the corresponding nodes.

##### flat

Type: `boolean`<br>
Default: `false`

This flag will make sure `include_in_root` gets used on the mapping in Elasticsearch. Internally this measn all fields
get flattened into the root document of the mapping.

This is useful to reduce storage size by de-duplicating or to allow easy `union` target style queries.

### Loading Models and Indices

Loading models and indices into ES-Alchemy can be done as following.
Note that an index can only be registered once all models used in the index have been registered. 

<!-- eslint-disable import/no-unresolved -->
```js
const ESA = require("es-alchemy");

const esa = ESA({ endpoint: "localhost:9200" });

Object.entries(ESA.loadJsonInDir("path/to/models"))
  .forEach(([name, specs]) => esa.model.register(name, specs));
Object.entries(ESA.loadJsonInDir("path/to/indices"))
  .forEach(([name, specs]) => index.index.register(name, specs));
```

### Generating Mappings

Mappings can be obtained from indices by calling:

`esa.index.getMapping("indexName");`

To (re)create a mapping in Elasticsearch run:

```js
Promise.all(esa.index.list().map(idx => esa.rest.mapping.recreate(idx)))
  .then(() => {
    // ...
  });
```

### Remapping and Ingesting Data

To insert data into Elasticsearch we need a *source object*. Data is then extracted from this source object
and remapped into a *target object* that can be ingested.

To define how the source object gets remapped, the `sources` fields in the nodes of the index are used.

Multiple sources for a node can be defined. This is really convenient when mappings e.g. keywords from multiple
entities in the *source object* to a single keywords relationship on the index.

When a index relationship maps to a single model, it is expected that no more than one model is retrieved.

Models and their fields are picked up from all paths defined in the `sources` Array. If a field is missing
from a source, it is skipped. Unexpected fields are skipped.

*Known limitations:*
  - Fields can not be renamed when remapping

To remap and ingest data run

```js
sourceObject = {/* ... */};
esa.rest.data
  .update("indexName", { upsert: [esa.data.remap("indexName", sourceObject)] });
```  

### Building Queries

To query data in Elasticsearch we first need to build a query. This is done using the ES-Alchemy query syntax.

List of all available commands for `filterBy`, `orderBy` and `scoreBy` can be found [here](src/resources/action-map.js).

When building a query the following options are available.

#### toReturn

Type: `Array`<br>
Default: `[""]`

Indicates which fields should be returned in the result. Nested fields can be accessed using dot notation.

#### filterBy

Type: `Array|Object`<br>
Default: `[]`

Allow restriction of results.

Pass in object containing an `or` or `and` key, mapping to a list of filter options.

A filter option is either a similarly structured object, a filter array or a string (shorthand notation).

When `and` is used, a `target` key can also be present with the values `separate` or `union`. This option only takes 
effect when multiple clauses search the same relationship. When `separate` is used, all conditions need to be 
met on the same object. When union is used, they can be met on different objects in the relationship.

`// todo: this section needs improvement`

#### orderBy

Type: `Array`<br>
Default: `[]`

Allow ordering of results. Takes precedence over scoring.

#### scoreBy

Type: `Array`<br>
Default: `[]`

Allow scoring of results. Ordering takes precedence over scoring.

#### limit

Type: `Integer`<br>
Default: `20`

Maximum amount of results returned.

#### offset

Type: `Integer`<br>
Default: `0`

Results to skip at the beginning of the results.
