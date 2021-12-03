const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

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
