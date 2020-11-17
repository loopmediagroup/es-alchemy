const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing version', { useTmpDir: true }, () => {
  let index;
  let offerId;

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    offerId = uuid4();
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test retrieving a version number for a document', async () => {
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k2: 'v2' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(2);
  });

  it('Test version and signature do not increase if update is identical', async () => {
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
  });

  it('Test version and signature do not increase if update is identical (with signature)', async () => {
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' },
        signature: null
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' },
        signature: '0_1'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.version('offer', offerId)).to.equal(1);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
  });

  it('Test throws an error if index does not exist', async ({ capture }) => {
    const error = await capture(() => index.rest.data.version('unknown', 'id'));
    expect(error.message).to.equal('index_not_found_exception');
  });

  it('Test returning null if document does not exist', async () => {
    expect(await index.rest.data.version('offer', 'id')).to.equal(null);
  });
});
