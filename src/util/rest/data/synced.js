const count = require('./count');
const { getIndexVersions } = require('../index/versions');

module.exports = async (call, idx) => {
  const remoteVersions = await getIndexVersions(call, idx);
  const countResult = await Promise.all(remoteVersions.map((version) => count(call, `${idx}@${version}`)));
  return countResult.every((c, _, arr) => c === arr[0]);
};
