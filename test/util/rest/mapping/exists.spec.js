import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing exists', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing mapping indexExists', async () => {
    expect(await index.rest.mapping.exists('offer')).to.equal(false);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.mapping.exists('offer')).to.equal(true);
  });
});
