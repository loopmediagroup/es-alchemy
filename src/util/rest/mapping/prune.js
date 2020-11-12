const assert = require('assert');

const getIndexVersions = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index.split('@')[1]);
};

const deleteIndexVersion = (call, idx, version) => call('DELETE', `${idx}@${version}`)
  .then((r) => r.statusCode === 200 && r.body.acknowledged === true);

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
