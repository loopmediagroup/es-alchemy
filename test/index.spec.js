const path = require("path");
const expect = require("chai").expect;
const chai = require("chai");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const Index = require('../src/index');

chai.use(deepEqualInAnyOrder);

const models = Index.loadJsonInDir(path.join(__dirname, "models"));
const indices = Index.loadJsonInDir(path.join(__dirname, "indices"));
const mappings = Index.loadJsonInDir(path.join(__dirname, "mappings"));
const fields = Index.loadJsonInDir(path.join(__dirname, "fields"));
const remaps = Index.loadJsonInDir(path.join(__dirname, "remaps"));
const query = Index.loadJsonInDir(path.join(__dirname, "query"));

describe('Testing index', () => {
  let index;
  before(() => {
    index = Index();
    Object.entries(models).forEach(([name, specs]) => {
      index.model.register(name, specs);
    });
    Object.entries(indices).forEach(([name, specs]) => {
      index.index.register(name, specs);
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
      expect(index.index.getFields(k)).to.deep.equal(v);
    });
  });

  it('Testing remap', () => {
    Object.entries(remaps).forEach(([k, v]) => {
      const remapped = index.data.remap(v.index, v.input);
      expect(remapped, `Debug: ${JSON.stringify(remapped)}`).to.deep.equal(v.result);
    });
  });

  it('Testing query.build', () => {
    Object.entries(query).forEach(([k, v]) => {
      const result = index.query.build({
        toReturn: v.toReturn || [""],
        filterBy: v.filterBy || [],
        orderBy: v.orderBy || [],
        scoreBy: v.scoreBy || [],
        limit: v.limit,
        offset: v.offset || 0
      });
      expect(result, `Debug: ${JSON.stringify(result)}`).to.deep.equalInAnyOrder(v.result);
    });
  });

  it('Testing query.build with defaults', () => {
    expect(index.query.build()).to.deep.equal({
      _source: [""],
      size: 20,
      sort: [{ id: { mode: "max", order: "asc" } }]
    });
  });
});
