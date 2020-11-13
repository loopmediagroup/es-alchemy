const path = require('path');
const { expect } = require('chai');
const { v4: uuid4 } = require('uuid');
const Joi = require('joi-strict');
const sfs = require('smart-fs');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing diverged', {
  useTmpDir: true,
  cryptoSeed: 'd9b0ed0b-a3d9-4cd6-85d8-0d090ad4bf3b'
}, () => {
  let index;
  let instantiateIndex;
  let updatedOfferModel;
  let updatedOfferIndex;
  let offerId;

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
    offerId = uuid4();
  });

  it('Testing single index', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.mapping.diverged('offer')).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId
      }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing index with cursor', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    const result = await index.rest.mapping.diverged('offer');
    expect(result).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId
      }
    });
    expect(await index.rest.mapping.diverged('offer', result.cursor)).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': null
      }
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

  it('Testing documents not in sync', async ({ dir, capture }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    instantiateIndex();
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    const offerId2 = uuid4();
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId2,
        headline: 'headline',
        subhead: 'subhead'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    const schema = Joi.object().keys({ // TODO: update this
      result: Joi.array().items(Joi.string().guid()),
      cursor: Joi.object().keys({
        'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0': Joi.string().guid(),
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': Joi.string().guid()
      })
    });
    const result = await index.rest.mapping.diverged('offer');
    expect(Joi.test(result, schema)).to.equal(true);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
