import assert from 'assert';
import get from 'lodash.get';
import cloneDeep from 'lodash.clonedeep';
import model from './util/model.js';
import { generateMapping, extractFields, extractRels } from './util/index.js';
import { page, remap } from './util/data.js';
import { build } from './util/query.js';
import Versions from './util/versions.js';
import rest from './util/rest/rest.js';
import { fromCursor, generatePage } from './util/paging.js';
import loadJsonInDir from './util/load-json-in-dir.js';

const fn = (options) => {
  const versions = Versions();
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
      mapping: generateMapping(name, specs, models),
      fields: extractFields(specs).concat('_id'),
      rels: extractRels(specs)
    };
  };

  return {
    paging: {
      generatePage
    },
    model: {
      register: (name, specs) => registerModel(name, specs)
    },
    index: {
      versions: {
        getModel: (idx) => versions.getModel(idx),
        getFields: (idx) => versions.getFields(idx),
        getRels: (idx) => versions.getRels(idx),
        list: (idx) => versions.list(idx).sort(),
        persist: (folder) => versions.persist(indices, folder),
        load: (folder) => versions.load(folder),
        raw: () => versions.raw()
      },
      register: (idx, specs) => registerIndex(idx, specs),
      list: () => Object.keys(indices).sort(),
      getMapping: (idx) => cloneDeep(indices[idx].mapping),
      getFields: (idx) => cloneDeep(indices[idx].fields),
      getSpecs: (idx) => cloneDeep(indices[idx].specs)
    },
    data: {
      remap: (idx, input) => remap(indices[idx].specs, input, models),
      page: (esResult, filter, meta = null) => page(esResult, filter, meta, options?.cursorSecret)
    },
    query: {
      build: (idx = null, opts = {}) => build(
        idx === null ? null : indices[idx].fields,
        idx === null ? null : indices[idx].mapping,
        opts,
        options
      )
    },
    cursor: {
      extract: (cursor) => fromCursor({
        cursor,
        cursorSecret: options?.cursorSecret
      })
    },
    rest: rest(
      (idx) => get(indices[idx], 'fields', null),
      (idx) => get(indices[idx], 'rels', null),
      (idx) => get(indices[idx], 'mapping', null),
      (idx) => get(indices[idx], 'specs', null),
      models,
      versions,
      options
    )
  };
};

fn.loadJsonInDir = loadJsonInDir;

export default fn;
