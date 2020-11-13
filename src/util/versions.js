const assert = require('assert');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
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

const extractFieldsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .map(([relName, childNode]) => extractFieldsRec(childNode, prefix.concat(relName)))
  .reduce(
    (p, c) => p.concat(c),
    node.fields.map((field) => prefix.concat(field).join('.'))
  );

const extractRelsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .reduce((prev, [relName, childNode]) => {
    const childPrefix = prefix.concat(relName);
    return Object.assign(
      prev,
      { [childPrefix.join('.')]: childNode.model },
      extractRelsRec(childNode, childPrefix)
    );
  }, {});

module.exports = () => {
  const indexVersions = {};
  return {
    getModel: (idx) => Object.values(indexVersions[idx])[0].specs.model,
    getFields: (idx) => {
      const result = new Set();
      Object
        .values(indexVersions[idx])
        .forEach(({ specs }) => {
          extractFieldsRec(specs)
            .forEach((f) => {
              result.add(f);
            });
        });
      return [...result];
    },
    getRels: (idx) => {
      const result = {};
      Object
        .values(indexVersions[idx])
        .forEach(({ specs }) => {
          Object
            .entries(extractRelsRec(specs))
            .forEach(([k, v]) => {
              result[k] = v;
            });
        });
      return result;
    },
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
      objectScan(['**'], {
        filterFn: ({ context, key, value }) => {
          if (!(key in context)) {
            context[key] = value;
          } else if (!isEqual(value, context[key])) {
            // todo: keyword and text are ok and should not raise
            // ...
            // todo: add coverage
            throw new Error(`Index inconsistency: ${JSON.stringify({ key, valueA: value, valueB: context[key] })}`);
          }
        },
        joined: true
      })(indexVersions, {});
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
