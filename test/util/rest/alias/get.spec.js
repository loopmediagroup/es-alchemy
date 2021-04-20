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
    expect(await index.rest.alias.get('offer')).to.deep.equal('offer@c1d54c12486d569d308e2c6f3554b6146b35a60a');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await index.rest.alias.get('offer')).to.equal(null);
  });
});
