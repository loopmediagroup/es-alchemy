const expect = require('chai').expect;
const { describe } = require('node-tdd');
const sfs = require('smart-fs');
const chai = require('chai');
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

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
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

  it('Testing index fields', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(fields).sort());
    Object.entries(fields).forEach(([k, v]) => {
      expect(index.index.getFields(k)).to.deep.equal(v.concat('_id'));
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

  it('Testing versions.list', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(index.index.list()).to.deep.equal(Object.keys(rels).sort());
    Object.entries(rels).forEach(([k, v], idx) => {
      expect(index.index.versions.list(k)).to.deep.equal([[
        'address@3e737db4f9999f34316b4683e981500b9ec0eeba',
        'location@7a6186ede8ebd095c25a03dc18438d43d7f7bf15',
        'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a'
      ][idx]]);
    });
  });

  it('Testing persist', ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(sfs.walkDir(dir).sort()).to.deep.equal(
      [
        'address@3e737db4f9999f34316b4683e981500b9ec0eeba.json',
        'location@7a6186ede8ebd095c25a03dc18438d43d7f7bf15.json',
        'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a.json'
      ]
    );
    expect(index.index.versions.persist(dir)).to.equal(false);
  });

  it('Testing load', async ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
  });
});
