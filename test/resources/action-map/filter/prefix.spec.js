const assert = require('assert');
const path = require('path');
const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const Index = require('../../../../src/index');

describe('Testing filter prefix', {
  useTmpDir: true
}, () => {
  let index;
  let idx;
  let mdl;
  before(() => {
    const dir = path.join(__dirname, 'prefix');
    idx = sfs.smartRead(path.join(dir, 'index.json'));
    mdl = sfs.smartRead(path.join(dir, 'models.json'));
  });

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    index.model.register('offer', mdl.offer);
    index.index.register('offer', idx);
    assert(await index.rest.mapping.create('offer') === true, 'Offer index exists');
    assert(await index.rest.alias.update('offer') === true, 'Offer alias exists');
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);
  });

  afterEach(async () => {
    assert(await index.rest.mapping.delete('offer') === true, 'Offer index delete failed');
  });

  const upsert = async (model, models) => {
    expect(await index.rest.data.update(models.map((o) => ({
      idx: model,
      action: 'update',
      doc: index.data.remap(model, o)
    }))), `${model} update failed`).to.equal(true);
    expect(await index.rest.data.refresh(model), `${model} refresh failed`).to.equal(true);
  };

  const query = async (model, filterParams) => {
    const filter = index.query.build(model, filterParams);
    const queryResult = await index.rest.data.query(model, filter);
    return index.data.page(queryResult, filter).payload;
  };

  it('Testing prefix', async () => {
    const offer1 = { id: `@${uuid4()}` };
    const offer2 = { id: `#${uuid4()}` };
    await upsert('offer', [offer1, offer2]);
    await Promise.all([
      {
        filterBy: ['id', 'prefix', '@'],
        result: [offer1]
      },
      {
        filterBy: ['id', 'prefix', '#'],
        result: [offer2]
      },
      {
        filterBy: ['id', 'notprefix', '@'],
        result: [offer2]
      },
      {
        filterBy: ['id', 'notprefix', '#'],
        result: [offer1]
      }
    ].map(async ({ filterBy, result }) => {
      expect(await query('offer', {
        toReturn: ['id'],
        filterBy
      }), `${filterBy}`).to.deep.equal(result);
    }));
  });
});
