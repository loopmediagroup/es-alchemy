const cloneDeep = require("lodash.clonedeep");
const model = require("./util/model");
const index = require("./util/index");
const data = require("./util/data");
const query = require("./util/query");
const rest = require("./util/rest/rest");
const loadJsonInDir = require("./util/load-json-in-dir");

module.exports = (options) => {
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
  const getMapping = idx => cloneDeep(indices[idx].mapping);

  return {
    model: {
      register: (name, specs) => registerModel(name, specs)
    },
    index: {
      register: (idx, specs) => registerIndex(idx, specs),
      list: () => Object.keys(indices).sort(),
      getMapping: idx => getMapping(idx),
      getFields: idx => cloneDeep(indices[idx].fields)
    },
    data: {
      remap: (idx, input) => data.remap(indices[idx].specs, input)
    },
    query: {
      build: (opts = {}) => query.build(opts)
    },
    rest: rest(getMapping, options)
  };
};

module.exports.loadJsonInDir = loadJsonInDir;
