import { expect } from 'chai';
import { describe } from 'node-tdd';
import { v4 as uuid4 } from 'uuid';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing exists', { useTmpDir: true }, () => {
  let index;

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);
  });

  it('Test exists is true if document exists', async () => {
    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.exists('offer', offerId)).to.equal(true);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing exists is false if document does not exist', async () => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.data.exists('offer', 'id')).to.equal(false);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
