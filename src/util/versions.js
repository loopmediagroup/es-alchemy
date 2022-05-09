import assert from 'assert';
import path from 'path';
import get from 'lodash.get';
import set from 'lodash.set';
import has from 'lodash.has';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';
import fs from 'smart-fs';
import Joi from 'joi-strict';
import objectScan from 'object-scan';
import objectFields from 'object-fields';
import { extractFields, extractRels } from './index.js';

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

export default () => {
  const indexVersions = {};
  const getVersions = (index) => {
    const result = indexVersions[index];
    if (result === undefined) {
      throw new Error('Index must be loaded');
    }
    return result;
  };
  return {
    getModel: (idx) => Object.values(indexVersions[idx])[0].specs.model,
    getFields: (idx) => {
      const result = new Set();
      Object
        .values(indexVersions[idx])
        .forEach(({ specs }) => {
          extractFields(specs)
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
            .entries(extractRels(specs))
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
        if (!fs.existsSync(filePath)) {
          fs.smartWrite(filePath, {
            timestamp: Math.floor(new Date().getTime() / 1000),
            ...def
          });
          result = true;
        }
      });
      return result;
    },
    load: (folderOrDef) => {
      if (typeof folderOrDef === 'string') {
        assert(Object.keys(indexVersions).length === 0, 'Cannot call load multiple times');
        const files = fs.walkDir(folderOrDef)
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.slice(0, -5));
        assert(files.length !== 0, 'No files found');
        files.forEach((file) => {
          const def = fs.smartRead(path.join(folderOrDef, `${file}.json`));
          Joi.assert(def, versionSchema);
          const defPath = file.split('@');
          def.prepare = (() => {
            const retainer = objectFields.Retainer(def.fields);
            const relsToCheck = Object.entries(def.rels)
              .filter(([_, v]) => v.endsWith('[]'))
              .map(([k]) => k);
            const emptyToNull = objectScan(relsToCheck, {
              useArraySelector: false,
              breakFn: ({ value, parent, property }) => {
                if (Array.isArray(value) && value.length === 0) {
                  // eslint-disable-next-line no-param-reassign
                  parent[property] = null;
                }
              }
            });
            return (doc_) => {
              const doc = cloneDeep(doc_);
              retainer(doc);
              emptyToNull(doc);
              return doc;
            };
          })();
          set(indexVersions, defPath, def);
        });
      } else {
        Object.assign(indexVersions, folderOrDef);
      }
      validate(indexVersions);
    },
    list: (index = null) => (index === null
      ? Object.keys(indexVersions)
      : Object.keys(getVersions(index)).map((v) => `${index}@${v}`)),
    get: getVersions
  };
};
