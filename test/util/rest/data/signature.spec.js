import { expect } from 'chai';
import get from 'lodash.get';
import { describe } from 'node-tdd';
import { v4 as uuid4 } from 'uuid';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing signature', { useTmpDir: true }, () => {
  let index;
  let offerId;

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    offerId = uuid4();
  });

  it('Test retrieving a signature for a document', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('0_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k2: 'v2' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('1_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test signature does not change if update is identical', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('0_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('0_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test signature mismatch', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('0_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    const err = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      }),
      signature: '1_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a'
    }]);
    expect(get(err, [0, 'update', 'error', 'type']))
      .to.equal('version_conflict_engine_exception');
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.signature('offer', offerId))
      .to.equal('0_1_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test throws an error if index does not exist', async ({ capture }) => {
    const error = await capture(() => index.rest.data.signature('unknown', 'id'));
    expect(error.message).to.equal('index_not_found_exception');
  });

  it('Test returning null if document does not exist', async () => {
    expect(await index.rest.data.signature('offer', 'id'))
      .to.equal('null_offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
