import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing delete', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing delete not found', async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
