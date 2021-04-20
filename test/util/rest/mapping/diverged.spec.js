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
      expect(await index.rest.data.update([{
        idx: 'offer',
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

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing single index', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    expect(await index.rest.mapping.diverged('offer')).to.deep.equal({
      result: [],
      cursor: { 'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a': offerId1 }
    });
  });

  it('Testing index with cursor', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    const result = await index.rest.mapping.diverged('offer');
    expect(result).to.deep.equal({
      result: [],
      cursor: { 'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a': offerId1 }
    });
    expect(await index.rest.mapping.diverged('offer', result.cursor)).to.deep.equal({
      result: [],
      cursor: null
    });
  });

  it('Testing invalid cursor keys', async ({ dir, capture }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    const error = await capture(() => index.rest.mapping.diverged('offer', {
      result: [],
      cursor: {}
    }));
    expect(error.message).to.equal('Invalid cursor provided');
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
    const result1 = await index.rest.mapping.diverged('offer');
    expect(result1).to.deep.equal({
      result: [offerId1],
      cursor: {
        'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a': offerId2,
        'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468': offerId2
      }
    });
    const result2 = await index.rest.mapping.diverged('offer', result1.cursor);
    expect(result2).to.deep.equal({
      result: [],
      cursor: null
    });
  });

  it('Testing index with null cursor', async ({ dir }) => {
    await createAndPersistEntity(dir, {
      id: offerId1,
      headline: 'headline'
    });
    expect(await index.rest.mapping.diverged(
      'offer',
      { 'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a': null }
    )).to.deep.equal({
      result: [],
      cursor: null
    });
  });
});
