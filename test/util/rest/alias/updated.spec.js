const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing alias updated', {
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
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test alias points to current version', async () => {
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.alias.updated('offer')).to.equal(true);
  });

  it('Test no alias exists', async () => {
    expect(await index.rest.alias.updated('offer')).to.equal(false);
  });

  it('Test alias does not point to current version', async () => {
    expect(await index.rest.alias.update('offer')).to.equal(true);
    await setupNewVersion();
    expect(await index.rest.alias.updated('offer')).to.deep.equal(false);
  });
});
