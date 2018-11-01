const crypto = require('crypto');
const expect = require("chai").expect;
const fieldDefinitions = require("../../src/resources/field-definitions");
const fieldRemap = require("../../src/resources/field-remap");
const actionMap = require('../../src/resources/action-map');

describe('Testing fields meta', () => {
  it('Testing remap and definitions match', () => {
    expect(Object.keys(fieldDefinitions).sort())
      .to.deep.equal(Object.keys(fieldRemap).sort());
  });

  it('Testing action map', () => {
    // force consistent 'randomBytes'
    const original = crypto.randomBytes;
    const seed = "3f48beca-1650-43f1-a0c9-b221cbff3692";
    crypto.randomBytes = (size, cb) => crypto.createHash('sha256').update(seed).digest()
      .slice(0, size);
    expect(actionMap.filter.false()).to.deep.equal({
      bool: {
        filter: {
          match: {
            id: {
              operator: "and",
              query: "f7797244aafb22fbadfde2655a8ff786"
            }
          }
        }
      }
    });
    // revert crypto
    crypto.randomBytes = original;
  });
});
