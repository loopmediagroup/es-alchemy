const cloneDeep = require("lodash.clonedeep");
const model = require("./util/model");
const index = require("./util/index");
const loadJsonInDir = require("./util/load-json-in-dir");

module.exports = () => {
  const models = {};
  const registerModel = (name, specs) => {
    models[name] = {
      original: specs,
      compiled: model.compile(specs)
    };
    return true;
  };

  const indices = {};
  const registerIndex = (name, specs) => {
    indices[name] = {
      original: specs,
      mapping: index.generateMapping(name, specs, models)
    };
    return true;
  };

  return {
    model: {
      register: registerModel
    },
    index: {
      register: registerIndex,
      list: () => Object.keys(indices).sort(),
      getMapping: key => cloneDeep(indices[key].mapping)
    }
  };
};

module.exports.loadJsonInDir = loadJsonInDir;
