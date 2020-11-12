const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing prune', {
  useTmpDir: true
}, () => {
  let instantiateIndex;
  let updatedOfferModel;
  let updatedOfferIndex;
  let index;
  let getIndices;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
      registerEntitiesForIndex(index);
    };
    const [offerModelPath, offerIndexPath] = ['models', 'indices']
      .map((v) => path.join(__dirname, '..', '..', '..', `${v}`, 'offer.json'));
    updatedOfferModel = sfs.smartRead(offerModelPath);
    updatedOfferIndex = sfs.smartRead(offerIndexPath);
    updatedOfferModel.fields.subhead = 'string';
    updatedOfferIndex.fields.push('subhead');
  });

  beforeEach(() => {
    instantiateIndex();
    getIndices = async () => {
      const r = await index.rest.call('GET', '_cat/indices');
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test pruning an old index', async ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect(await index.rest.mapping.sync('offer')).to.deep.equal([
      'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      'offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    ]);
    expect(await getIndices()).to.deep.equal([
      'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      'offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    ]);
    instantiateIndex();
    sfs.unlinkSync(path.join(dir, 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440.json'));
    index.index.versions.load(dir);
    expect(await index.rest.mapping.prune('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await getIndices()).to.deep.equal(['offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
