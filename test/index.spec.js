const path = require("path");
const expect = require("chai").expect;
const Index = require('../src/index');

const models = Index.loadJsonInDir(path.join(__dirname, "models"));
const indices = Index.loadJsonInDir(path.join(__dirname, "indices"));

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

  it('Testing registration', () => {
    expect(index.index.list()).to.deep.equal(["offer"]);
    expect(index.index.getMapping("offer")).to.deep.equal({
      mappings: {
        offer: {
          properties: {
            id: {
              type: "keyword"
            },
            headline: {
              type: "text"
            },
            locations: {
              type: "nested",
              properties: {
                id: {
                  type: "keyword"
                },
                name: {
                  type: "text"
                },
                address: {
                  type: "nested",
                  properties: {
                    id: {
                      type: "keyword"
                    },
                    street: {
                      type: "text"
                    },
                    city: {
                      type: "text"
                    },
                    country: {
                      type: "text"
                    },
                    centre: {
                      type: "geo_point"
                    },
                    area: {
                      type: "geo_shape"
                    },
                    timezone: {
                      type: "text"
                    }
                  }
                },
                tags: {
                  type: "nested",
                  properties: {
                    id: {
                      type: "keyword"
                    },
                    name: {
                      type: "text"
                    }
                  },
                  include_in_root: true
                }
              }
            }
          }
        }
      }
    });
  });
});
