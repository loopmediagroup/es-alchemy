const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing prune', {
  useTmpDir: true
}, () => {
  let index;
  let offerId;
  let getIndices;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
    getIndices = async () => {
      const r = await index.rest.call('GET', '_cat/indices');
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test pruning an old index', async ({ fixture, dir }) => {
    const updatedOfferModel = fixture('models/offer.json');
    const updatedOfferIndex = fixture('indices/offer.json');
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await getIndices()).to.deep.equal([
      'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      'offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    ]);
    expect(await index.rest.mapping.prune('offer')).to.deep.equal(['e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0']);
    expect(await getIndices()).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
