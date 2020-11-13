const traverse = require('../../../misc/traverse');

const getPersistedVersionsByIndex = (versions, idx) => {
  const persistedVersions = Object.keys(versions.get(idx));
  return persistedVersions.map((version) => `${idx}@${version}`);
};

const listDocuments = async (call, idx, cursor) => {
  const result = await call('GET', idx, {
    endpoint: '_search',
    body: {
      _source: ['id'],
      ...(cursor === null ? {} : { search_after: [cursor] }),
      size: 99,
      sort: [
        {
          _id: {
            order: 'asc'
          }
        }
      ]
    }
  });
  return result.body.hits.hits.map(({ _id: id }) => id);
};

module.exports = async (call, versions, mapping, idx, cursor = null) => {
  const localVersions = getPersistedVersionsByIndex(versions, idx);
  if (cursor !== null) {
    const cursorKeys = Object.keys(cursor);
    if (cursorKeys.length !== localVersions.length || !cursorKeys.every((c) => localVersions.includes(c))) {
      throw new Error('Invalid cursor keys');
    }
  }
  const docs = await Promise.all(localVersions.map((i) => listDocuments(call, i, cursor === null ? null : cursor[i])));
  const traverseResult = traverse(...docs);
  return {
    result: traverseResult.result,
    cursor: traverseResult.cursor.reduce((prev, c, i) => Object.assign(prev, {
      [localVersions[i]]: c === null ? null : c
    }), {})
  };
};
