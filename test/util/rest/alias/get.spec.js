const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing alias get', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Test retrieving an index alias', async () => {
    expect(await index.rest.alias.get('offer')).to.equal(null);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.alias.get('offer')).to.deep.equal('offer@6a1b8f491e156e356ab57e8df046b9f449acb440');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await index.rest.alias.get('offer')).to.equal(null);
  });
});
