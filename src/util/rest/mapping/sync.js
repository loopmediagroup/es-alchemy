const assert = require('assert');

const getIndices = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index.split('@')[1]);
};

const createIndex = (call, idx, mapping) => call(
  'PUT',
  // eslint-disable-next-line no-underscore-dangle
  `${idx}@${mapping.mappings._meta.hash}`,
  { body: mapping }
).then((r) => r.statusCode === 200 && r.body.acknowledged === true);

module.exports = async (call, versions, idx) => {
  const versionsByIndex = versions.get(idx);
  assert(versionsByIndex !== undefined, 'Index must be loaded');
  const indexVersions = await getIndices(call, idx);
  const indicesToCreate = Object.entries(versionsByIndex).filter(([key, _]) => !indexVersions.includes(key));
  const indicesCreatedResult = await Promise.all(
    indicesToCreate.map(([_, { mapping }]) => createIndex(call, idx, mapping))
  );
  const indicesCreated = indicesToCreate.map(([v, _]) => `${idx}@${v}`);
  assert(indicesCreatedResult.every((e) => e === true), indicesCreated);
  return indicesCreated;
};
