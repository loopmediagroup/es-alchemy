const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const sfs = require('smart-fs');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing synced', { useTmpDir: true }, () => {
  let index;
  let instantiateIndex;
  let persistAndLoadVersion;
  let offerId;
  let setupNewVersion;
  let updateDocument;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.opensearchEndpoint });
      registerEntitiesForIndex(index);
    };
    persistAndLoadVersion = async (dir) => {
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
    };
  });

  beforeEach(async ({ dir }) => {
    offerId = uuid4();
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
    updateDocument = async () => {
      expect(await index.rest.data.update([{
        idx: 'offer',
        action: 'update',
        doc: index.data.remap('offer', {
          id: offerId,
          meta: { k1: 'v1' },
          subhead: 'subhead'
        })
      }])).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
    };

    instantiateIndex();
    await persistAndLoadVersion(dir);
    expect(await index.rest.mapping.apply('offer'))
      .to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test documents are synced', async () => {
    await setupNewVersion();
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468']);
    await updateDocument();
    expect(await index.rest.data.synced('offer')).to.equal(true);
  });

  it('Test documents are not synced', async () => {
    await updateDocument();
    await setupNewVersion();
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468']);
    expect(await index.rest.data.synced('offer')).to.equal(false);
  });

  it('Test remote index version does not exist', async () => {
    await setupNewVersion();
    expect(await index.rest.data.synced('offer')).to.equal(false);
  });
});
