const expect = require('chai').expect;
const Index = require('../../src/index');
const { remaps, registerEntitiesForIndex } = require('../helper');

describe('Testing fields meta', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing remap', () => {
    Object.entries(remaps).forEach(([k, v]) => {
      const remapped = index.data.remap(v.index, v.input);
      expect(remapped, `Debug: ${JSON.stringify(remapped)}`).to.deep.equal(v.result);
    });
  });
});
