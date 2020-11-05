const { expect } = require('chai');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const versions = require('../../src/util/versions');
const Index = require('../../src/index');
const { registerEntitiesForIndex } = require('../helper');

describe('Testing Versions', {
  useTmpDir: true
}, () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing load', ({ dir }) => {
    expect(index.versions.persist(dir)).to.equal(true);
    const result = versions.load(dir);
    const schema = Joi.object().pattern(
      Joi.string().valid(
        'a2066a68e07cc088f3fb8921ba0fa4f3541b569a',
        '127f07825e9279eb9f3bf334e5dd575916f09128',
        '6a1b8f491e156e356ab57e8df046b9f449acb440'
      ),
      Joi.object().keys({
        timestamp: Joi.number().integer(),
        specs: Joi.object(),
        mapping: Joi.object(),
        fields: Joi.array().items(Joi.string()),
        rels: Joi.object()
      })
    );
    expect(Object.keys(result).sort()).to.deep.equal(['address', 'location', 'offer']);
    expect(Object.values(result).every((e) => Joi.test(e, schema))).to.equal(true);
  });
});
