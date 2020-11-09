const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { indices, queryMappings, registerEntitiesForIndex } = require('../../../helper');

describe('Testing diverged', {
  useTmpDir: true
}, () => {
  let index;
  let offerId;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
  });

  it('Testing diverged all indices equal', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    await index.rest.mapping.diverged('offer');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
