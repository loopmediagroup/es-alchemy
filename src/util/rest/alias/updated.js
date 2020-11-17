const assert = require('assert');

module.exports = async (call, versions, idx) => {
  const localVersions = Object.keys(versions.get(idx))
    .map((version) => `${idx}@${version}`);
  const result = (await call('GET', '', {
    endpoint: `_cat/aliases/${idx}`
  })).body;
  assert([0, 1].includes(result.length), result);
  return result.length === 0 ? false : localVersions.includes(result[0].index);
};
