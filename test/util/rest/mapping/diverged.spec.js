const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { indices, queryMappings, registerEntitiesForIndex } = require('../../../helper');

describe('Testing diverged', {
  useTmpDir: true
}, () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing diverged all indices equal', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    await index.rest.mapping.diverged('offer');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
