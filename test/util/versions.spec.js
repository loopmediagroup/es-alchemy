const { expect } = require('chai');
const { v4: uuid4 } = require('uuid');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const Versions = require('../../src/util/versions');

describe('Testing Versions', {
  useTmpDir: true
}, () => {
  let versions;
  let hash;
  let indices;

  beforeEach(() => {
    versions = Versions();
    hash = uuid4();
    indices = { offer: { mapping: { mappings: { _meta: { hash } } } } };
  });

  it('Testing list', ({ dir }) => {
    expect(versions.persist(indices, dir)).to.equal(true);
    versions.load(dir);
    const result = versions.list();
    expect(result).to.deep.equal(['offer']);
  });

  it('Testing get', ({ dir }) => {
    expect(versions.persist(indices, dir)).to.equal(true);
    versions.load(dir);
    const result = versions.get('offer');
    const schema = Joi.object().pattern(
      Joi.string().valid(hash),
      Joi.object().keys({
        timestamp: Joi.number().integer(),
        mapping: Joi.object()
      })
    );
    expect(Object.keys(result).sort()).to.deep.equal([hash]);
    expect(Joi.test(result, schema)).to.equal(true);
  });
});
