const expect = require('chai').expect;
const Index = require('../../src/index');
const fieldDefinitions = require('../../src/resources/field-definitions');
const fieldRemap = require('../../src/resources/field-remap');
const { remaps, registerEntitiesForIndex } = require('../helper');

describe('Testing fields meta', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing remap and definitions match', () => {
    expect(Object.keys(fieldDefinitions).sort())
      .to.deep.equal(Object.keys(fieldRemap).sort());
  });

  it('Testing remap', () => {
    Object.entries(remaps).forEach(([k, v]) => {
      const remapped = index.data.remap(v.index, v.input);
      expect(remapped, `Debug: ${JSON.stringify(remapped)}`).to.deep.equal(v.result);
    });
  });
});
