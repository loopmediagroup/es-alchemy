const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing apply', {
  useTmpDir: true
}, () => {
  let index;
  let getIndices;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    getIndices = async (idx) => {
      const r = await index.rest.call('GET', `_cat/indices/${idx}@*`);
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test adding missing index to Opensearch', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await getIndices('offer')).to.deep.equal([]);
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await getIndices('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test apply no missing index in Opensearch', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect(await getIndices('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.apply('offer')).to.deep.equal([]);
    expect(await getIndices('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
