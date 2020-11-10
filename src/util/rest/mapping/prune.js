const assert = require('assert');

const getIndices = async (call) => {
  const result = await call('GET', '', {
    endpoint: '_cat/indices'
  });
  return result.body.map(({ index }) => index);
};

const deleteIndex = (call, idx) => call('DELETE', idx)
  .then((r) => r.statusCode === 200 && r.body.acknowledged === true);

module.exports = async (call, versions) => {
  const indices = await getIndices(call);
  const persistedIndices = versions.listWithVersions();
  const indicesToPrune = indices.filter((i) => !persistedIndices.includes(i));
  const indicesPrunedResult = await Promise.all(indicesToPrune.map((index) => deleteIndex(call, index)));
  assert(indicesPrunedResult.every((e) => e === true), indicesToPrune);
  return indicesToPrune;
};
