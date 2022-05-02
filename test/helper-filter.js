/* eslint-disable mocha/no-exports */
import path from 'path';
import assert from 'assert';
import { expect } from 'chai';
import fs from 'smart-fs';
import { describe as desc } from 'node-tdd';
import Index from '../src/index.js';

let index;

const getCallerFile = () => {
  const originalFunc = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const result = new Error().stack[2].getFileName().slice(5);
  Error.prepareStackTrace = originalFunc;
  return result;
};

export const describe = (name, fn) => {
  const testDir = getCallerFile().replace(/\.spec\.js$/, '');
  const idx = fs.smartRead(path.join(testDir, 'index.json'));
  const mdls = fs.smartRead(path.join(testDir, 'models.json'));
  const idxName = idx.model;

  desc(name, {
    useTmpDir: true
  }, () => {
    // eslint-disable-next-line mocha/no-top-level-hooks
    beforeEach(async ({ dir }) => {
      index = Index({ endpoint: process.env.opensearchEndpoint });
      Object.entries(mdls).forEach(([k, v]) => {
        index.model.register(k, v);
      });
      index.index.register(idxName, idx);
      assert(await index.rest.mapping.create(idxName) === true, `${idxName} index exists`);
      assert(await index.rest.alias.update(idxName) === true, `${idxName} alias exists`);
      expect(await index.index.versions.persist(dir)).to.equal(true);
      expect(await index.index.versions.load(dir)).to.equal(undefined);
    });

    // eslint-disable-next-line mocha/no-top-level-hooks
    afterEach(async () => {
      assert(await index.rest.mapping.delete(idxName) === true, `${idxName} index delete failed`);
    });

    fn(() => index);
  });
};

export const upsert = async (model, models) => {
  expect(await index.rest.data.update(models.map((o) => ({
    idx: model,
    action: 'update',
    doc: index.data.remap(model, o)
  }))), `${model} update failed`).to.equal(true);
  expect(await index.rest.data.refresh(model), `${model} refresh failed`).to.equal(true);
};

export const query = async (model, filterParams) => {
  const filter = index.query.build(model, filterParams);
  const queryResult = await index.rest.data.query(model, filter);
  return index.data.page(queryResult, filter).payload;
};
