const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing pruned', {
  useTmpDir: true
}, () => {
  let index;
  let instantiateIndex;
  let persistAndLoadVersion;
  let setupNewVersion;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
      registerEntitiesForIndex(index);
    };
    persistAndLoadVersion = (dir) => {
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
    };
  });

  beforeEach(async ({ dir }) => {
    setupNewVersion = async () => {
      instantiateIndex();
      const [offerModelPath, offerIndexPath] = ['models', 'indices']
        .map((v) => path.join(__dirname, '..', '..', '..', `${v}`, 'offer.json'));
      const updatedOfferModel = sfs.smartRead(offerModelPath);
      const updatedOfferIndex = sfs.smartRead(offerIndexPath);
      updatedOfferModel.fields.subhead = 'string';
      updatedOfferIndex.fields.push('subhead');
      index.model.register('offer', updatedOfferModel);
      index.index.register('offer', updatedOfferIndex);
      await persistAndLoadVersion(dir);
    };
    instantiateIndex();
    await persistAndLoadVersion(dir);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test all remote versions exist locally', async () => {
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.pruned('offer')).to.equal(true);
  });

  it('Test no remote versions', async () => {
    expect(await index.rest.mapping.pruned('offer')).to.equal(true);
  });

  it('Test remote versions missing locally', async ({ dir }) => {
    await setupNewVersion();
    expect(await index.rest.mapping.apply('offer')).to.deep.equal([
      'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      'offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    ]);
    instantiateIndex();
    sfs.unlinkSync(path.join(dir, 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440.json'));
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.mapping.pruned('offer')).to.equal(false);
  });
});
