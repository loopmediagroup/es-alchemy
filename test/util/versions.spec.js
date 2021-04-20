const { expect } = require('chai');
const set = require('lodash.set');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const Versions = require('../../src/util/versions');

describe('Testing Versions', {
  useTmpDir: true
}, () => {
  let versions;
  let loadOfferIndex;

  beforeEach(({ fixture, dir }) => {
    versions = Versions();
    loadOfferIndex = () => {
      const offerIndex = fixture('offer');
      expect(versions.persist(offerIndex, dir)).to.equal(true);
      versions.load(dir);
    };
  });

  it('Testing list', () => {
    loadOfferIndex();
    const result = versions.list();
    expect(result).to.deep.equal(['offer']);
  });

  it('Testing get', () => {
    loadOfferIndex();
    const result = versions.get('offer');
    const schema = Joi.object().pattern(
      Joi.string().valid('c1d54c12486d569d308e2c6f3554b6146b35a60a'),
      Joi.object().keys({
        timestamp: Joi.number().integer(),
        specs: Joi.object(),
        mapping: Joi.object(),
        fields: Joi.array().items(Joi.string()),
        rels: Joi.object(),
        prepare: Joi.function()
      })
    );
    expect(Joi.test(result, schema)).to.equal(true);
  });

  it('Testing get index not loaded error', () => {
    expect(() => versions.get('offer')).to.throw('Index must be loaded');
  });

  it('Testing load index inconsistency error', ({ fixture, dir }) => {
    const offerIndex = fixture('offer');
    expect(versions.persist(offerIndex, dir)).to.equal(true);
    set(offerIndex, 'offer.mapping.mappings.properties.headline.type', 'object');
    set(offerIndex, 'offer.mapping.mappings._meta.hash', '35ec51a3c35e2d9982e1ac2bbe23957a637a9e0');
    expect(versions.persist(offerIndex, dir)).to.equal(true);
    expect(() => versions.load(dir)).to.throw(
      'Index inconsistency: {"key":["offer","properties","headline","type"],"valueA":"text","valueB":"object"}'
    );
  });

  it('Testing getModel', () => {
    loadOfferIndex();
    const result = versions.getModel('offer');
    expect(result).to.deep.equal('offer');
  });

  it('Testing getFields', ({ fixture }) => {
    loadOfferIndex();
    const result = versions.getFields('offer');
    expect(result).to.deep.equal(fixture('get-fields'));
  });

  it('Testing getRels', ({ fixture }) => {
    loadOfferIndex();
    const result = versions.getRels('offer');
    expect(result).to.deep.equal(fixture('get-rels'));
  });
});
