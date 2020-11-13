const assert = require('assert');
const { getIndexVersions, deleteIndexVersion } = require('../index/versions');

module.exports = async (call, versions, idx) => {
  const localVersions = Object.keys(versions.get(idx));
  const remoteVersions = await getIndexVersions(call, idx);
  const versionsToPrune = remoteVersions.filter((i) => !localVersions.includes(i));
  const versionsPrunedResult = await Promise.all(
    versionsToPrune.map((version) => deleteIndexVersion(call, idx, version))
  );
  const removedVersions = versionsToPrune.map((version) => `${idx}@${version}`);
  assert(versionsPrunedResult.every((e) => e === true), removedVersions);
  return removedVersions;
};
