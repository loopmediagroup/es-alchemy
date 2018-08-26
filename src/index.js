const cloneDeep = require("lodash.clonedeep");
const model = require("./util/model");
const index = require("./util/index");
const data = require("./util/data");
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
      register: registerModel
    },
    index: {
      register: registerIndex,
      list: () => Object.keys(indices).sort(),
      getMapping: idx => cloneDeep(indices[idx].mapping),
      getFields: idx => cloneDeep(indices[idx].fields)
    },
    data: {
      remap: (idx, input) => data.remap(indices[idx].specs, input)
    }
  };
};

module.exports.loadJsonInDir = loadJsonInDir;
