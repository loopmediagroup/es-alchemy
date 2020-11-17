const assert = require('assert');
const { getIndexVersions, createIndexVersion } = require('../index/versions');

module.exports = async (call, versions, idx) => {
  const localVersions = versions.get(idx);
  const remoteVersions = await getIndexVersions(call, idx);
  const versionsToCreate = Object.entries(localVersions).filter(([key, _]) => !remoteVersions.includes(key));
  const versionsCreatedResult = await Promise.all(
    versionsToCreate.map(([_, { mapping }]) => createIndexVersion(call, idx, mapping))
  );
  const versionsCreated = versionsToCreate.map(([v, _]) => `${idx}@${v}`);
  assert(versionsCreatedResult.every((e) => e === true), versionsCreated);
  return versionsCreated;
};
