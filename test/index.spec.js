const expect = require('chai').expect;
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const chai = require('chai');
const { v4: uuid4 } = require('uuid');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const Index = require('../src/index');
const {
  indices,
  mappings,
  fields,
  rels,
  registerEntitiesForIndex
} = require('./helper');

chai.use(deepEqualInAnyOrder);

describe('Testing index', {
  useTmpDir: true
}, () => {
  let index;
  let offerId;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
  });

  it('Testing models', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    Object.entries(indices).forEach(([k, v]) => {
      expect(index.index.versions.getModel(k)).to.equal(v.model);
    });
  });

  it('Testing specs', () => {
    Object.entries(indices).forEach(([k, v]) => {
      expect(index.index.getSpecs(k)).to.deep.equal({ name: k, ...v });
    });
  });

  it('Testing mappings', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(mappings).sort());
    Object.entries(mappings).forEach(([k, v]) => {
      expect(index.index.getMapping(k)).to.deep.equal(v);
    });
  });

  it('Testing fields', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(index.index.list()).to.deep.equal(Object.keys(fields).sort());
    Object.entries(fields).forEach(([k, v]) => {
      expect(index.index.versions.getFields(k)).to.deep.equal(v);
    });
  });

  it('Testing rels', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(index.index.list()).to.deep.equal(Object.keys(rels).sort());
    Object.entries(rels).forEach(([k, v]) => {
      expect(index.index.versions.getRels(k)).to.deep.equal(v);
    });
  });

  it('Testing persist', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(sfs.walkDir(dir).sort()).to.deep.equal(
      [
        'address@a2066a68e07cc088f3fb8921ba0fa4f3541b569a.json',
        'location@127f07825e9279eb9f3bf334e5dd575916f09128.json',
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440.json'
      ]
    );
    expect(index.index.versions.persist(dir)).to.equal(false);
  });

  it('Testing load', async ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
  });

  it('Testing count', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: { k1: 'v1' }
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(1);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
