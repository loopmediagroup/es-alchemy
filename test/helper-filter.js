const path = require('path');
const assert = require('assert');
const { expect } = require('chai');
const sfs = require('smart-fs');
const Index = require('../src/index');

let index;
let idx;
let mdls;

module.exports.beforeEach = async (dir, tmpDir) => {
  idx = sfs.smartRead(path.join(dir, 'index.json'));
  mdls = sfs.smartRead(path.join(dir, 'models.json'));
  index = Index({ endpoint: process.env.elasticsearchEndpoint });
  index.model.register('entity', mdls.entity);
  index.index.register('entity', idx);
  assert(await index.rest.mapping.create('entity') === true, 'Entity index exists');
  assert(await index.rest.alias.update('entity') === true, 'Entity alias exists');
  expect(await index.index.versions.persist(tmpDir)).to.equal(true);
  expect(await index.index.versions.load(tmpDir)).to.equal(undefined);
};

module.exports.afterEach = async () => {
  assert(await index.rest.mapping.delete('entity') === true, 'entity index delete failed');
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
