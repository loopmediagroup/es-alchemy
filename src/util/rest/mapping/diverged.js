const get = require('lodash.get');
const traverse = require('../../../misc/traverse');

const getPersistedVersionsByIndex = (versions, idx) => {
  const persistedVersions = Object.keys(versions.get(idx));
  return persistedVersions.map((version) => `${idx}@${version}`);
};

const getESVersionsByIndex = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index);
};

const listDocuments = async (call, idx) => {
  const result = await call('GET', idx, { endpoint: '_search' });
  // console.log(result.body)
  return result.body.hits.hits;
};

module.exports = async (call, versions, indexSpec, idx) => {
  const registeredVersion = `${idx}@${get(indexSpec, 'mapping.mappings._meta.hash')}`;
  const persistedVersions = getPersistedVersionsByIndex(versions, idx);
  const esVersions = await getESVersionsByIndex(call, idx);
  const docs = await Promise.all([
    registeredVersion,
    ...persistedVersions,
    ...esVersions
  ].map((i) => listDocuments(call, i)));
  const ids = docs.map((e) => e.map(({ _id: id }) => id));
  return traverse(...ids);
};
