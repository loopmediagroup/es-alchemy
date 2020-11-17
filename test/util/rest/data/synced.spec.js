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
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
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
      expect(await index.rest.data.update('offer', [{
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
    expect(await index.rest.mapping.sync('offer'))
      .to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test documents are synced', async () => {
    await setupNewVersion();
    expect(await index.rest.mapping.sync('offer')).to.deep.equal(['offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0']);
    await updateDocument();
    expect(await index.rest.data.synced('offer')).to.equal(true);
  });

  it('Test documents are not synced', async () => {
    await updateDocument();
    await setupNewVersion();
    expect(await index.rest.mapping.sync('offer')).to.deep.equal(['offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0']);
    expect(await index.rest.data.synced('offer')).to.equal(false);
  });

  it('Test remote index version does not exist', async () => {
    await setupNewVersion();
    expect(await index.rest.data.synced('offer')).to.equal(false);
  });
});
