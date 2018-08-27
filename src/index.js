const cloneDeep = require("lodash.clonedeep");
const model = require("./util/model");
const index = require("./util/index");
const data = require("./util/data");
const query = require("./util/query");

const restCall = require("./util/rest/call");
const restMappingCreate = require("./util/rest/mapping/create");
const restMappingDelete = require("./util/rest/mapping/delete");
const restMappingGet = require("./util/rest/mapping/get");
const restMappingRecreate = require("./util/rest/mapping/recreate");
const restDataCount = require("./util/rest/data/count");
const restDataQuery = require("./util/rest/data/query");
const restDataRefresh = require("./util/rest/data/refresh");
const restDataUpdate = require("./util/rest/data/update");

const loadJsonInDir = require("./util/load-json-in-dir");

module.exports = () => {
  const models = {};
  const registerModel = (name, specs) => {
    models[name] = {
      specs,
      compiled: model.compile(specs)
    };
  };

  const indices = {};
  const registerIndex = (name, specs) => {
    indices[name] = {
      specs,
      mapping: index.generateMapping(name, specs, models),
      fields: index.extractFields(specs)
    };
  };

  return {
    model: {
      register: (name, specs) => registerModel(name, specs)
    },
    index: {
      register: (idx, specs) => registerIndex(idx, specs),
      list: () => Object.keys(indices).sort(),
      getMapping: idx => cloneDeep(indices[idx].mapping),
      getFields: idx => cloneDeep(indices[idx].fields)
    },
    data: {
      remap: (idx, input) => data.remap(indices[idx].specs, input)
    },
    query: {
      build: (options = {}) => query.build(options)
    },
    rest: {
      call: (method, idx, options = {}) => restCall(method, idx, options),
      mapping: {
        create: idx => restMappingCreate(idx, indices[idx].mapping),
        delete: idx => restMappingDelete(idx),
        get: idx => restMappingGet(idx),
        recreate: idx => restMappingRecreate(idx, indices[idx].mapping)
      },
      data: {
        count: idx => restDataCount(idx),
        query: (idx, filter, options = {}) => restDataQuery(idx, filter, options),
        refresh: idx => restDataRefresh(idx),
        update: (idx, options) => restDataUpdate(idx, options)
      }
    }
  };
};

module.exports.loadJsonInDir = loadJsonInDir;
