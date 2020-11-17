const assert = require('assert');

module.exports = async (call, idx, mapping) => {
  const result = (await call('GET', '', {
    endpoint: `_cat/aliases/${idx}`
  })).body;
  assert([0, 1].includes(result.length), result);
  return result.length === 0
    ? false
    // eslint-disable-next-line no-underscore-dangle
    : `${idx}@${mapping.mappings._meta.hash}` === result[0].index;
};
