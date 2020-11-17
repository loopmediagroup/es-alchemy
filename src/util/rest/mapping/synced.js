const isEqual = require('lodash.isequal');
const { getIndexVersions } = require('../index/versions');

module.exports = async (call, versions, idx) => {
  const localVersions = Object.keys(versions.get(idx));
  const remoteVersions = await getIndexVersions(call, idx);
  return isEqual(localVersions, remoteVersions);
};
