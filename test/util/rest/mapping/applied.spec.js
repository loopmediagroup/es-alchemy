const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing applied', {
  useTmpDir: true
}, () => {
  let index;

  beforeEach(({ dir }) => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test mapping is applied', async () => {
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.applied('offer')).to.equal(true);
  });

  it('Test mapping is not applied', async () => {
    expect(await index.rest.mapping.applied('offer')).to.equal(false);
  });
});
