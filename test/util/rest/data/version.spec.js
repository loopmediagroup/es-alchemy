const { expect } = require('chai');
const { describe } = require('node-tdd');
const uuid4 = require('uuid/v4');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing version', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Test retrieving a version number for a document', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', {
      upsert: [index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })]
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.update('offer', {
      upsert: [index.data.remap('offer', {
        id: offerId,
        meta: { k2: 'v2' }
      })]
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(2);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test version number does not increase if update is identical', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', {
      upsert: [index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })]
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.update('offer', {
      upsert: [index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })]
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test throws an error if index does not exist', async ({ capture }) => {
    const error = await capture(() => index.rest.data.version('offer', 'id'));
    expect(error.message).to.equal('index_not_found_exception');
  });

  it('Test returning null if document does not exist', async () => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', 'id')).to.equal(null);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
