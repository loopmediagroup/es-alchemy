const { expect } = require('chai');
const { v4: uuid4 } = require('uuid');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');

describe('Testing Versions', {
  useTmpDir: true
}, () => {
  let versions;
  let hash;
  let indices;

  beforeEach(() => {
    Object.keys(require.cache).forEach((key) => {
      delete require.cache[key];
    });
    // eslint-disable-next-line global-require
    versions = require('../../src/util/versions');
    hash = uuid4();
    indices = {
      offer: {
        mapping: {
          mappings: {
            _meta: {
              hash
            }
          }
        }
      }
    };
  });

  it('Testing get', ({ dir }) => {
    expect(versions.persist(indices, dir)).to.equal(true);
    versions.load(dir);
    const result = versions.get(dir);
    const schema = Joi.object().pattern(
      Joi.string().valid(hash),
      Joi.object().keys({
        timestamp: Joi.number().integer(),
        mapping: Joi.object()
      })
    );
    expect(Object.keys(result).sort()).to.deep.equal(['offer']);
    expect(Object.values(result).every((e) => Joi.test(e, schema))).to.equal(true);
  });
});
