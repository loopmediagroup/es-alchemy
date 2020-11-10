const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing prune', {
  useTmpDir: true
}, () => {
  let index;
  let getIndices;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    getIndices = async () => {
      const r = await index.rest.call('GET', '_cat/indices');
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test pruning an old index', async ({ fixture, dir }) => {
    const updatedOfferModel = fixture('models/offer.json');
    const updatedOfferIndex = fixture('indices/offer.json');
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.mapping.create('address')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await getIndices()).to.deep.equal([
      'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      'address@a2066a68e07cc088f3fb8921ba0fa4f3541b569a'
    ]);
    expect(await index.rest.mapping.prune('offer')).to.deep.equal(['offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0']);
    expect(await getIndices()).to.deep.equal(['address@a2066a68e07cc088f3fb8921ba0fa4f3541b569a']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await index.rest.mapping.delete('address')).to.equal(true);
  });
});
