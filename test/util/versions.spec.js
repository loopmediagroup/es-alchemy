const { expect } = require('chai');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const Versions = require('../../src/util/versions');

describe('Testing Versions', {
  useTmpDir: true
}, () => {
  let versions;

  beforeEach(({ fixture, dir }) => {
    versions = Versions();
    const offerIndex = fixture('offer');
    expect(versions.persist(offerIndex, dir)).to.equal(true);
    versions.load(dir);
  });

  it('Testing getModel', () => {
    const result = versions.getModel('offer');
    expect(result).to.deep.equal('offer');
  });

  it('Testing getFields', ({ fixture }) => {
    const result = versions.getFields('offer');
    expect(result).to.deep.equal(fixture('get-fields'));
  });

  it('Testing getRels', ({ fixture }) => {
    const result = versions.getRels('offer');
    expect(result).to.deep.equal(fixture('get-rels'));
  });

  it('Testing list', () => {
    const result = versions.list();
    expect(result).to.deep.equal(['offer']);
  });

  it('Testing get', () => {
    const result = versions.get('offer');
    const schema = Joi.object().pattern(
      Joi.string().valid('6a1b8f491e156e356ab57e8df046b9f449acb440'),
      Joi.object().keys({
        timestamp: Joi.number().integer(),
        specs: Joi.object(),
        mapping: Joi.object(),
        fields: Joi.array().items(Joi.string()),
        rels: Joi.object()
      })
    );
    expect(Joi.test(result, schema)).to.equal(true);
  });

  it('Testing get index not loaded error', () => {
    expect(() => versions.get('unknown')).to.throw('Index must be loaded');
  });
});
