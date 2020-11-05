const assert = require('assert');

module.exports = async (call, idx) => {
  const result = (await call('GET', '', {
    endpoint: `_cat/aliases/${idx}`
  })).body;
  assert([0, 1].includes(result.length), result);
  return result.length === 0 ? null : result[0].index;
};
