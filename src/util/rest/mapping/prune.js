const assert = require('assert');

const getIndices = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index);
};

const deleteIndex = (call, idx) => call('DELETE', idx)
  .then((r) => r.statusCode === 200 && r.body.acknowledged === true);

module.exports = async (call, versions, idx) => {
  const indices = await getIndices(call, idx);
  const indexVersions = versions.get(idx);
  assert(indexVersions !== undefined, 'Index must be loaded');
  const persistedIndices = Object.keys(indexVersions).map((v) => `${idx}@${v}`);
  const indicesToPrune = indices.filter((i) => !persistedIndices.includes(i));
  const indicesPrunedResult = await Promise.all(indicesToPrune.map((index) => deleteIndex(call, index)));
  assert(indicesPrunedResult.every((e) => e === true), indicesToPrune);
  return indicesToPrune;
};
