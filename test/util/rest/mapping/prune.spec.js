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
    expect(await index.rest.mapping.apply('offer')).to.deep.equal([
      'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a',
      'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468'
    ]);
    expect(await getIndices()).to.deep.equal([
      'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a',
      'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468'
    ]);
    instantiateIndex();
    sfs.unlinkSync(path.join(dir, 'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468.json'));
    index.index.versions.load(dir);
    expect(await index.rest.mapping.prune('offer')).to.deep.equal(['offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468']);
    expect(await getIndices()).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
