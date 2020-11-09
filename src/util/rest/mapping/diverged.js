const get = require('lodash.get');
const { get: getPersistedVersions } = require('../../versions');
const traverse = require('../../../misc/traverse');

const getPersistedVersionsByIndex = (idx) => {
  const persistedVersions = getPersistedVersions();
  const indexVersions = persistedVersions[idx];
  return Object.keys(indexVersions).map((version) => `${idx}@${version}`);
};

const getESVersionsByIndex = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index);
};

const listDocuments = async (call, idx) => {
  const result = await call('GET', idx, { endpoint: '_search' });
  return result.body.hits.hits;
};

module.exports = async (call, idx, indexSpec) => {
  const registeredVersion = `${idx}@${get(indexSpec, 'mapping.mappings._meta.hash')}`;
  const persistedVersions = getPersistedVersionsByIndex(idx);
  const esVersions = await getESVersionsByIndex(call, idx);
  const docs = await Promise.all([
    registeredVersion,
    ...persistedVersions,
    ...esVersions
  ].map((i) => listDocuments(call, i)));
  const ids = docs.map((e) => e.map(({ _id: id }) => id));
  return traverse(...ids);
};
