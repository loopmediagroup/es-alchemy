# ESAlchemy

[![Build Status](https://circleci.com/gh/loopmediagroup/es-alchemy.png?style=shield)](https://circleci.com/gh/loopmediagroup/es-alchemy)
[![NPM](https://img.shields.io/npm/v/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)
[![Downloads](https://img.shields.io/npm/dt/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)

Simplification of Opensearch interactions

## Install

```bash
npm i --save es-alchemy
```

## Setup

Outline of how [ESAlchemy](https://github.com/loopmediagroup/es-alchemy) can be used, step by step:

- Define data models
- Define indices based on the data models
- Generate (versioned) schemas for indices, create them in Opensearch and alias them for querying
- Obtain input data as defined in the source mappings of index and remap it
- Insert remapped data into Opensearch
- Build a query using the ES-Alchemy query syntax
- Run query against Opensearch
- Map result to simplified representation with paging information

### Model and Index Definitions

#### Models

Models definitions contain the fields of a model and their types. They restrict how an index can be put together.

Example: **address.json**
```json
{
  "fields": {
    "id": "uuid",
    "street": "string",
    "city": "string",
    "country": "string",
    "centre": "point",
    "area": "shape",
    "timezone": "string"
  }
}
```

Preferably a folder `models` contains a json file for each model. An example can be
found in the [test folder](test/models).

Fields that can be used and how they get mapped in Opensearch can
be found [here](src/resources/field-definitions.js).

#### Indices

Indices define how data, models and  mappings all tie together.

Example: **location.json**
```json
{
  "model": "location",
  "fields": [
    "id",
    "name"
  ],
  "nested": {
    "address": {
      "model": "address",
      "fields": [
        "id",
        "street",
        {
          "name": "city",
          "overwrite": {}
        },
        "country",
        "centre",
        "area",
        "timezone"
      ],
      "sources": [
        "address"
      ]
    }
  }
}

```

Preferably a folder `indices` contains a json file for each index. An example can be
found in the [test folder](test/indices).

Each index is defined as a nested structure of nodes.
Nodes are defined recursively and each node has the following fields:

##### settings

Opensearch [index settings](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#index-modules-settings). Can only be defined top level.

##### version

Type: `string`<br>
Default: `null`

Defines the version of this index. Should only be defined on root node.

##### model

Type: `string`<br>
Required.

Model that is used for the node.

Can append `[]` for non-root nodes to indicate `to-many` relationship.

##### fields

Type: `Array`<br>
Required.

Fields of the node model that are included in this index.
Needs to be a subset of the fields defined on the model.

To customize the field definition for a given index, an object of the form
```json
{
  "name": "field-name",
  "overwrite": {
    "custom": "option"
  }
}
```
can be used, instead of simply using `"field-name"`.

##### sources

Type: `Array`<br>
Default: `[""]`

Defines the relative sources for data ingestion.
How this works is explained under data ingestion and remapping.

##### nested

Type: `Object`<br>
Default: `{}`

Defines all children of the node. Keys indicate the
relationship names and the values define the nodes.

To indicate that a `to-many` relationship is defined, append `[]` to the model name in the node.

##### flat

Type: `boolean`<br>
Default: `false`

This flag sets `include_in_root` to true on the generated Opensearch mapping.
Internally in Opensearch this means all fields get flattened into the root document of the mapping.

This is useful to reduce storage size by de-duplicating and to enforce
`union` target style queries (see corresponding section for more on this).

### Loading Models and Indices

Loading models and indices into ES-Alchemy can be done as following.
Note that an index can only be registered once all models used in the index have been registered.

<!-- eslint-disable import/no-unresolved -->
```js
import ESA from 'es-alchemy';

const esa = ESA({ endpoint: 'localhost:9200' });

Object.entries(ESA.loadJsonInDir('path/to/models'))
  .forEach(([name, specs]) => esa.model.register(name, specs));
Object.entries(ESA.loadJsonInDir('path/to/indices'))
  .forEach(([name, specs]) => esa.index.register(name, specs));
```

### Generating Mappings

Mappings can be obtained from indices by calling:

`esa.index.getMapping("indexName");`

To (re)create a mapping in Opensearch run:

```js
Promise.all(esa.index.list().map((idx) => esa.rest.mapping.recreate(idx)))
  .then(() => {
    // ...
  });
```

### Remapping and Ingesting Data

To insert data into Opensearch we need a *source object*. Data is then extracted from this source object
and remapped into a *target object* that can be ingested into Opensearch.

To define how the source object gets remapped, the `sources` fields in the nodes of the index are used.

Multiple sources for a node can be defined. This is really convenient when mappings e.g. keywords from multiple
entities in the *source object* to a single keywords relationship on the index.

When an index relationship maps to a single model (`to-one`), it is expected that no more than one model is retrieved.

Models and their fields are picked up from all paths defined in the `sources` Array. An empty string indicates root level.
If a field is missing from a source, it is skipped. Unexpected fields are skipped.

Sources are defined relative to their parent sources.

*Known limitations:*
  - Fields can not be renamed when remapping

To remap and ingest data run

```js
sourceObject = {/* ... */};
esa.rest.data
  .update('indexName', [{ action: 'update', doc: esa.data.remap('indexName', sourceObject) }]);
```

`// todo: this needs an example`

### Building Queries

To query data in Opensearch we first need to build a query. This is done using the ESAlchemy query syntax.

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
met on the same object. When union is used, they can be met on different objects in the relationship. The `target`
defaults to `separate`, which is what you want in most cases.

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

## Constructor

#### protocol

Type: `string`<br>
Default: `http`

The protocol for connecting to Opensearch. Can be `http` or `https`.

#### endpoint

Type: `string`<br>
Default: `opensearch:9200`

The endpoint for connecting to Opensearch. Common values include `localhost:9200`.

#### aws

Type: `object`<br>
Default: `{}`

Allow connection to AWS Opensearch instance by passing
in object containing `accessKeyId` and `secretAccessKey`.

#### cursorSecret

Type: `string`<br>
Default: _undefined_

When passed all cursors are signed and the signature checked on decoding.
For security reasons this should always be passed when the cursor can be modified by malicious actors.

#### responseHook

Type: `function`<br>
Default: `undefined`

If provided, a hook that is run after every request.

The response hook accepts `({ request, response })`.

`request` is the query input, exposing `{ headers, method, endpoint, index, body }`.<br>
`response` is the raw response returned from [request](https://github.com/request/request).

Example:

<!-- eslint-disable import/no-unresolved -->
```js
import ESA from 'es-alchemy';

ESA({
  responseHook: ({ request, response }) => {
    if (response.elapsedTime > 500) {
      logger.warning(`Query time ${request.index}\n${JSON.stringify(request.body)}`);
    }
  }
});
```

## Index Versions

Indices are versioned using a computed hash deduced from their schema. So an index named `foo` uses
multiple mappings as `foo@HASH` under the hood. When updating or deleting a document the document
is changed in all version. Which index version is active depends on the index alias.

When the version of an index changes the new index mapping needs to be created. Calling `mapping.apply` on
every initialization should be ok to do this.

## Document Signatures

Document signatures can be used to ensure that a document updated is the document that the signature was read for.

## Api

Available commands

#### id

Automatically generated by hashing the passed options. Can change between versions.

#### model

- `register(name: String, definition: Object)` - register a model with ES-Alchemy

#### index

- `versions.list(name: String)` - List versions locally known for index
- `versions.persist(folder: String)` - persist index versions to a specified folder (history of versions)
- `versions.load(folderOrObject: String|Object)` - loads persisted index versions into memory
- `versions.raw()` - return raw internal data that can be loaded later
- `versions.getFields(name: String)` - get union of fields for all index versions
- `versions.getRels(name: String)` - get union of rels for this index (returned as object mapping to node type)
- `versions.getModel(name: String)` - get top level model for this index (should never be changed)
- `register(name: String, definitions: Object)` - register an index with ES-Alchemy
- `list()` - list all indices registered with ES-Alchemy
- `getMapping(name: String)` - get the mapping for Opensearch for this index
- `getFields(name: String)` - get all fields (including nested) for this index

#### data

- `remap(name: String, source: Object)` - remap source object to ingestible object, see details in corresponding section
- `page(esResult: Object, filter: Object)` - convert `esResult` object into simplified page representation using `filter` to compute paging information

#### query

- `build(name: String?, options: Object)` - build a query, index is optional and can be passed as null, see details in corresponding section

#### rest

Interacting with the rest api of Opensearch

- `call(method: String, name: String, options: Object)` - make direct API call to Opensearch
- `alias.get(name: String)` - return the index version for alias
- `alias.update(name: String)` - update alias for index, linking to current index version
- `alias.updated(name: String)` - returns true if alias points to current index version
- `mapping.apply(index: String)` - Creates tracked (known) indices in Opensearch when missing
- `mapping.applied(index: String)` - returns true if every local versions exists remotely
- `mapping.create(name: String)` - create mapping on Opensearch (call when version changes)
- `mapping.delete(name: String)` - delete mapping from Opensearch (deletes _all_ versions)
- `mapping.diverged(name: String, cursor: Object, esas = null)` - get document difference between the index versions, or if esas are passed, between the aliases
- `mapping.exists(name: String)` - returns `true` if latest mapping exists
- `mapping.get(name: String)` - get mapping details from Opensearch (against alias)
- `mapping.list()` - Lists all mappings currently in Opensearch
- `mapping.prune(index: String)` - Removes index versions from Opensearch that are not tracked (unknown)
- `mapping.pruned(index: String)` - returns true if all remote versions exist locally
- `mapping.recreate(name: String)` - recreate mapping on Opensearch (deletes _all_ versions and recreates current version)
- `data.count(name: String, filter: Object = null)` - get number of indexed elements from alias
- `data.exists(index: String, id: String)` - check if document exists in any index version
- `data.query(name: String, filter: Object, options: Object)` - query for data in Opensearch against alias. Returns raw result body from Opensearch.
- `data.refresh(name: String)` - refresh Opensearch index, useful e.g. when testing (all versions)
- `data.signature(index: String, id: String)` - get signature as `${_seq_no}_${_primary_term}_${idx}@${version}` in alias for document or `null_${idx}@${version}` if document does not exist
- `data.stats()` - returns all the statistics for the nodes in a cluster like: indices, cpu usage and other meta
- `data.synced(index: String, esas = null)` - returns true if all local index version (or all esas index aliases) exists on remote(s) and have the same document count
- `data.uniques(index: String, fields: String[] || String, opts = { filterBy = {}, limit = 20, cursor = null, count = boolean })` - get unique values from index for field, using filter. When count true, the counts per unique are returned
- `data.update(actions: Object, raw: Boolean = false)` - update or delete documents in Opensearch (all index versions), raw flag always resolves with full response
- `data.version(index: String, id: String)` - get version number in alias for document or null if document does not exist


## Tests

All tests need to be run in docker. Start with:

```bash
. manage.sh
```

To test Opensearch works correctly, run

```bash
curl http://opensearch:9200/_cluster/health
```

Run all tests with

```bash
npm t
```
