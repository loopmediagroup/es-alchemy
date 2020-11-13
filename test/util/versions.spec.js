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

  it('Testing getFields', () => {
    const result = versions.getFields('offer');
    // todo: as fixture (dont use length)
    expect(result.length).to.deep.equal(23);
  });

  it('Testing getRels', () => {
    const result = versions.getRels('offer');
    // todo: as fixture
    expect(result).to.deep.equal({
      locations: 'location[]',
      'locations.address': 'address',
      'locations.tags': 'tag[]',
      tags: 'tag[]',
      flatAddress: 'address[]'
    });
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
