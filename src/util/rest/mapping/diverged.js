import isEqual from 'lodash.isequal';
import traverse from '../../../misc/traverse.js';

const listDocuments = async (call, idx, cursor) => {
  const result = await call('GET', idx, {
    endpoint: '_search',
    body: {
      _source: ['id'],
      ...(cursor === null ? {} : { search_after: [cursor] }),
      size: 99,
      sort: [{ _id: { order: 'asc' } }]
    }
  });
  return result.body.hits.hits.map(({ _id: id }) => id);
};

export default async ({
  call,
  versions,
  idx,
  cursor = null
}) => {
  const localVersions = Object.keys(versions.get(idx))
    .map((version) => `${idx}@${version}`);
  if (cursor !== null) {
    const cursorKeys = Object.keys(cursor);
    if (!isEqual(localVersions, cursorKeys)) {
      throw new Error('Invalid cursor provided');
    }
  }
  const docs = await Promise.all(localVersions.map((i) => {
    if (cursor === null) {
      return listDocuments(call, i, null);
    }
    if (cursor[i] === null) {
      return Promise.resolve([]);
    }
    return listDocuments(call, i, cursor[i]);
  }));
  const traverseResult = traverse(...docs);
  if (traverseResult.cursor.every((c) => c === null)) {
    return {
      result: traverseResult.result,
      cursor: null
    };
  }
  return {
    result: traverseResult.result,
    cursor: traverseResult.cursor.reduce((prev, c, i) => Object.assign(prev, {
      [localVersions[i]]: c
    }), {})
  };
};
