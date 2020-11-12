const { expect } = require('chai');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing sync', {
  useTmpDir: true
}, () => {
  let index;
  let getIndices;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    getIndices = async (idx) => {
      const r = await index.rest.call('GET', `_cat/indices/${idx}@*`);
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test adding missing index to ElasticSearch', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
    expect(await getIndices('offer')).to.deep.equal([]);
    expect(await index.rest.mapping.sync('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await getIndices('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test sync no missing index in ElasticSearch', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect(await getIndices('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.sync('offer')).to.deep.equal([]);
    expect(await getIndices('offer')).to.deep.equal(['offer@6a1b8f491e156e356ab57e8df046b9f449acb440']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
