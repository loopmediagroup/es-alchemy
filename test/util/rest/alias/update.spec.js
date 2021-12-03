const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing alias update', () => {
  let index;
  let getAliases;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    getAliases = async () => {
      const r = await index.rest.call('GET', '_cat/aliases');
      return r.body.map(({ alias }) => alias);
    };
  });

  it('Test alias an index version', async () => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await getAliases()).to.deep.equal(['offer']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await getAliases()).to.deep.equal([]);
  });
});
