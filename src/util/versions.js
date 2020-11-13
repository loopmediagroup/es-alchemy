const assert = require('assert');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const has = require('lodash.has');
const isEqual = require('lodash.isequal');
const sfs = require('smart-fs');
const Joi = require('joi-strict');
const objectScan = require('object-scan');

const versionSchema = Joi.object().keys({
  timestamp: Joi.number().integer(),
  specs: Joi.object(),
  mapping: Joi.object(),
  fields: Joi.array().items(Joi.string()),
  rels: Joi.object()
});

const validate = (() => {
  const asSimple = (v) => {
    if (['text', 'keyword'].includes(v)) {
      return '<simple>';
    }
    return v;
  };
  const scanner = objectScan(['*.*.mapping.mappings.**.properties.*.type'], {
    filterFn: ({ context, key: k, value }) => {
      const key = [k[0], ...k.slice(4)];
      if (!has(context, key)) {
        set(context, key, value);
      } else if (!isEqual(asSimple(value), asSimple(get(context, key)))) {
        throw new Error(`Index inconsistency: ${JSON.stringify({
          key,
          valueA: value,
          valueB: get(context, key)
        })}`);
      }
    }
  });
  return (indexVersions) => scanner(indexVersions, {});
})();

module.exports = () => {
  const indexVersions = {};
  return {
    persist: (indices, folder) => {
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
    load: (folder) => {
      assert(Object.keys(indexVersions).length === 0, 'Cannot call load multiple times');
      const files = sfs.walkDir(folder)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.slice(0, -5));
      assert(files.length !== 0, 'No files found');
      files.forEach((file) => {
        const def = sfs.smartRead(path.join(folder, `${file}.json`));
        Joi.assert(def, versionSchema);
        const defPath = file.split('@');
        set(indexVersions, defPath, def);
      });
      validate(indexVersions);
    },
    list: () => Object.keys(indexVersions),
    get: (index) => {
      const result = indexVersions[index];
      if (result === undefined) {
        throw new Error('Index must be loaded');
      }
      return result;
    }
  };
};
