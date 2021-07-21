const path = require('path');
const assert = require('assert');
const { expect } = require('chai');
const sfs = require('smart-fs');

module.exports.readDir = (dir) => {
  const index = sfs.smartRead(path.join(dir, 'index.json'));
  const models = sfs.smartRead(path.join(dir, 'models.json'));
  return { index, models };
};

module.exports.registerAndCreateEntity = async (index, mdl, idx, dir) => {
  index.model.register('entity', mdl.entity);
  index.index.register('entity', idx);
  assert(await index.rest.mapping.create('entity') === true, 'Entity index exists');
  assert(await index.rest.alias.update('entity') === true, 'Entity alias exists');
  expect(await index.index.versions.persist(dir)).to.equal(true);
  expect(await index.index.versions.load(dir)).to.equal(undefined);
};

module.exports.removeEntity = async (index) => {
  assert(await index.rest.mapping.delete('entity') === true, 'entity index delete failed');
};

module.exports.upsert = async (index, model, models) => {
  expect(await index.rest.data.update(models.map((o) => ({
    idx: model,
    action: 'update',
    doc: index.data.remap(model, o)
  }))), `${model} update failed`).to.equal(true);
  expect(await index.rest.data.refresh(model), `${model} refresh failed`).to.equal(true);
};

module.exports.query = async (index, model, filterParams) => {
  const filter = index.query.build(model, filterParams);
  const queryResult = await index.rest.data.query(model, filter);
  return index.data.page(queryResult, filter).payload;
};
