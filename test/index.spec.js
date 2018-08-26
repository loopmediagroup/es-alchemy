const path = require("path");
const expect = require("chai").expect;
const Index = require('../src/index');

const models = Index.loadJsonInDir(path.join(__dirname, "models"));
const indices = Index.loadJsonInDir(path.join(__dirname, "indices"));
const mappings = Index.loadJsonInDir(path.join(__dirname, "mappings"));

describe('Testing index', () => {
  let index;
  before(() => {
    index = Index();
    Object.entries(models).forEach(([name, specs]) => {
      expect(index.model.register(name, specs)).to.equal(true);
    });
    Object.entries(indices).forEach(([name, specs]) => {
      expect(index.index.register(name, specs)).to.equal(true);
    });
  });

  it('Testing mappings', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(mappings).sort());
    Object.entries(mappings).forEach(([k, v]) => {
      expect(index.index.getMapping(k)).to.deep.equal(v);
    });
  });
});
