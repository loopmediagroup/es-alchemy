const path = require('path');
const assert = require('assert');
const { expect } = require('chai');
const sfs = require('smart-fs');
const { describe } = require('node-tdd');
const Index = require('../src/index');

let index;
let idx;
let mdls;

const getCallerFile = () => {
  const originalFunc = Error.prepareStackTrace;
  const err = new Error();
  let callerfile;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const currentfile = err.stack.shift().getFileName();
    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();
      if (currentfile !== callerfile) {
        break;
      }
    }
  } catch (e) { /* ignored */ }
  Error.prepareStackTrace = originalFunc;
  return callerfile;
};

module.exports.describe = (name, fn) => {
  const testDir = getCallerFile().replace(/\.spec\.js$/, '');
  idx = sfs.smartRead(path.join(testDir, 'index.json'));
  mdls = sfs.smartRead(path.join(testDir, 'models.json'));
  const idxName = idx.model;

  describe(name, {
    useTmpDir: true
  }, () => {
    beforeEach(async ({ dir }) => {
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
      index.model.register(idxName, mdls.entity);
      index.index.register(idxName, idx);
      assert(await index.rest.mapping.create(idxName) === true, `${idxName} index exists`);
      assert(await index.rest.alias.update(idxName) === true, `${idxName} alias exists`);
      expect(await index.index.versions.persist(dir)).to.equal(true);
      expect(await index.index.versions.load(dir)).to.equal(undefined);
    });

    afterEach(async () => {
      assert(await index.rest.mapping.delete(idxName) === true, `${idxName} index delete failed`);
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    fn();
  });
};

module.exports.upsert = async (model, models) => {
  expect(await index.rest.data.update(models.map((o) => ({
    idx: model,
    action: 'update',
    doc: index.data.remap(model, o)
  }))), `${model} update failed`).to.equal(true);
  expect(await index.rest.data.refresh(model), `${model} refresh failed`).to.equal(true);
};

module.exports.query = async (model, filterParams) => {
  const filter = index.query.build(model, filterParams);
  const queryResult = await index.rest.data.query(model, filter);
  return index.data.page(queryResult, filter).payload;
};
