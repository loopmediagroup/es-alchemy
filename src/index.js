const assert = require('assert');
const path = require('path');
const get = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');
const sfs = require('smart-fs');
const model = require('./util/model');
const index = require('./util/index');
const data = require('./util/data');
const query = require('./util/query');
const rest = require('./util/rest/rest');
const loadJsonInDir = require('./util/load-json-in-dir');

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
    assert(!name.includes('@'), 'Index name must not include `@`.');
    indices[name] = {
      specs: { name, ...specs },
      mapping: index.generateMapping(name, specs, models),
      fields: index.extractFields(specs).concat('_id'),
      rels: index.extractRels(specs)
    };
  };

  return {
    model: {
      register: (name, specs) => registerModel(name, specs)
    },
    index: {
      persist: (folder) => {
        let result = false;
        Object.entries(indices).forEach(([idx, def]) => {
          const key = `${idx}@${get(def, 'mapping.mappings._meta.hash')}.json`;
          const filePath = path.join(folder, key);
          if (!sfs.existsSync(filePath)) {
            sfs.smartWrite(filePath, {
              timestamp: Math.floor(new Date().getTime() / 1000),
              ...def
            });
            result = true;
          }
        });
        return result;
      },
      register: (idx, specs) => registerIndex(idx, specs),
      list: () => Object.keys(indices).sort(),
      getMapping: (idx) => cloneDeep(indices[idx].mapping),
      getFields: (idx) => cloneDeep(indices[idx].fields),
      getRels: (idx) => cloneDeep(indices[idx].rels),
      getModel: (idx) => indices[idx].specs.model,
      getSpecs: (idx) => cloneDeep(indices[idx].specs)
    },
    data: {
      remap: (idx, input) => data.remap(indices[idx].specs, input, models),
      page: (esResult, filter) => data.page(esResult, filter)
    },
    query: {
      build: (idx = null, opts = {}) => query.build(idx === null ? null : indices[idx].fields, opts)
    },
    rest: rest((idx) => get(indices[idx], 'rels', null), (idx) => get(indices[idx], 'mapping', null), options)
  };
};

module.exports.loadJsonInDir = loadJsonInDir;
