const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const sfs = require('smart-fs');
const { get: getPersistedVersions } = require('../../versions');

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

module.exports = async (call, idx, indexSpec) => {
  const persistedVersions = getPersistedVersionsByIndex(idx);
  const esVersions = await getESVersionsByIndex(call, idx);
  const registeredVersion = `${idx}@${get(indexSpec, 'mapping.mappings._meta.hash')}`;
};

