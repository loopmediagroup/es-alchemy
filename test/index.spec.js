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

  it('Testing models', () => {
    Object.entries(indices).forEach(([k, v]) => {
      expect(index.index.getModel(k)).to.equal(v.model);
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

  it('Testing fields', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(fields).sort());
    Object.entries(fields).forEach(([k, v]) => {
      expect(index.index.getFields(k)).to.deep.equal(v.concat('_id'));
    });
  });

  it('Testing rels', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(rels).sort());
    Object.entries(rels).forEach(([k, v]) => {
      expect(index.index.getRels(k)).to.deep.equal(v);
    });
  });

  it('Testing persist', ({ dir }) => {
    expect(index.index.persist(dir)).to.equal(true);
    expect(sfs.walkDir(dir).sort()).to.deep.equal(
      [
        'address@a2066a68e07cc088f3fb8921ba0fa4f3541b569a.json',
        'location@127f07825e9279eb9f3bf334e5dd575916f09128.json',
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440.json'
      ]
    );
    expect(index.index.persist(dir)).to.equal(false);
  });
});
