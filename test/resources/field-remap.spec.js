const expect = require('chai').expect;
const fieldDefinitions = require('../../src/resources/field-definitions');
const fieldRemap = require('../../src/resources/field-remap');

describe('Testing fields meta', () => {
  it('Testing remap and definitions match', () => {
    expect(Object.keys(fieldDefinitions).sort())
      .to.deep.equal(Object.keys(fieldRemap).sort());
  });
});
