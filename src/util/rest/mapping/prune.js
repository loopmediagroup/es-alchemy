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
  const remoteVersions = await getIndexVersions(call, idx);
  const localVersions = versions.get(idx);
  assert(localVersions !== undefined, 'Index must be loaded');
  const persistedVersions = Object.keys(localVersions);
  const versionsToPrune = remoteVersions.filter((i) => !persistedVersions.includes(i));
  const indicesPrunedResult = await Promise.all(
    versionsToPrune.map((version) => deleteIndexVersion(call, idx, version))
  );
  assert(indicesPrunedResult.every((e) => e === true), versionsToPrune);
  return versionsToPrune;
};
