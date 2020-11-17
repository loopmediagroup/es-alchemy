const count = require('./count');

module.exports = async (call, versions, idx) => {
  const localVersions = Object.keys(versions.get(idx));
  const countResult = await Promise.all(localVersions.map((version) => count(call, `${idx}@${version}`)));
  if (countResult.some((c) => !Number.isInteger(c))) {
    return false;
  }
  return countResult.every((c, _, arr) => c === arr[0]);
};
