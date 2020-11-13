const path = require('path');
const { expect } = require('chai');
const { v4: uuid4 } = require('uuid');
const sfs = require('smart-fs');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing diverged', {
  useTmpDir: true
}, () => {
  let index;
  let instantiateIndex;
  let updatedOfferModel;
  let updatedOfferIndex;
  let createAndPersistEntity;
  let offerId1;
  let offerId2;

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
    createAndPersistEntity = async (dir, input) => {
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
      expect(await index.rest.data.update('offer', [{
        action: 'update',
        doc: index.data.remap('offer', input)
      }])).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
    };
  });

  beforeEach(() => {
    instantiateIndex();
    [offerId1, offerId2] = [uuid4(), uuid4()].sort();
  });

  it('Testing single index', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    expect(await index.rest.mapping.diverged('offer')).to.deep.equal({
      result: [],
      cursor: { 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId1 }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing index with cursor', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    const result = await index.rest.mapping.diverged('offer');
    expect(result).to.deep.equal({
      result: [],
      cursor: { 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId1 }
    });
    expect(await index.rest.mapping.diverged('offer', result.cursor)).to.deep.equal({
      result: [],
      cursor: { 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': null }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing invalid cursor keys', async ({ dir, capture }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    const error = await capture(() => index.rest.mapping.diverged('offer', {
      result: [],
      cursor: {
        'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0': '120ecadc-7344-4516-a54f-76b05111f47f',
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': '120ecadc-7344-4516-a54f-76b05111f47f'
      }
    }));
    expect(error.message).to.equal('Invalid cursor keys');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing documents not in sync', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    instantiateIndex();
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    await createAndPersistEntity(dir, {
      id: offerId2,
      headline: 'headline',
      subhead: 'subhead'
    });
    const result = await index.rest.mapping.diverged('offer');
    expect(result).to.deep.equal({
      result: [offerId1],
      cursor: {
        'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0': offerId2,
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId1
      }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
