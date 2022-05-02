import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing applied', {
  useTmpDir: true
}, () => {
  let index;

  beforeEach(({ dir }) => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test mapping is applied', async () => {
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.applied('offer')).to.equal(true);
  });

  it('Test mapping is not applied', async () => {
    expect(await index.rest.mapping.applied('offer')).to.equal(false);
  });
});
