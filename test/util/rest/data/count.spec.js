const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing count', { useTmpDir: true }, () => {
  let index;
  let offerId;

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.alias.update('offer')).to.equal(true);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing count on alias', async () => {
    expect(await index.rest.data.count('offer')).to.equal(0);
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(1);
    const filter1 = index.query.build('offer', {
      filterBy: ['id', '==', uuid4()]
    });
    expect(await index.rest.data.count('offer', filter1)).to.equal(0);
    const filter2 = index.query.build('offer', {
      filterBy: ['id', '==', offerId]
    });
    expect(await index.rest.data.count('offer', filter2)).to.equal(1);
  });

  it('Testing count not found', async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(false);
  });
});
