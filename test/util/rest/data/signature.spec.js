const { expect } = require('chai');
const get = require('lodash.get');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing signature', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Test retrieving a signature for a document', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k2: 'v2' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('1_1');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test signature does not change if update is identical', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test signature mismatch', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    const err = await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      }),
      signature: '1_1'
    }]);
    expect(get(err, [0, 'update', 'error', 'type']))
      .to.equal('version_conflict_engine_exception');
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId)).to.equal('0_1');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test throws an error if index does not exist', async ({ capture }) => {
    const error = await capture(() => index.rest.data.signature('offer', 'id'));
    expect(error.message).to.equal('index_not_found_exception');
  });

  it('Test returning null if document does not exist', async () => {
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', 'id')).to.equal(null);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
