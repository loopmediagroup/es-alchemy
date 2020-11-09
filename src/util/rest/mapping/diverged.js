const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const sfs = require('smart-fs');
const { get: getPersistedVersions } = require('../../versions');
const { build } = require('../../query');

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

module.exports = async (call, idx, indexSpec, query) => {
  const persistedVersions = getPersistedVersionsByIndex(idx);
  const esVersions = await getESVersionsByIndex(call, idx);
  const registeredVersion = `${idx}@${get(indexSpec, 'mapping.mappings._meta.hash')}`;
  const filter = build(['id', 'headline'], {
    toReturn: ['id', 'headline'],
    limit: 1,
    offset: 0
  });
  const result = await query(registeredVersion, filter);
};

