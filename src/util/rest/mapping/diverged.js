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
  esas = null,
  idx,
  cursor = null
}) => {
  const logic = esas === null
    ? Object.keys(versions.get(idx)).map((version) => [`${idx}@${version}`, call])
    : esas.map((esa) => [`${idx}#${esa.id}`, esa.rest.call]);
  if (cursor !== null) {
    const cursorKeys = Object.keys(cursor);
    if (!isEqual(logic.map(([i]) => i), cursorKeys)) {
      throw new Error('Invalid cursor provided');
    }
  }
  const docs = await Promise.all(logic.map(([i, c]) => {
    if (cursor === null) {
      return listDocuments(c, i.split('#')[0], null);
    }
    if (cursor[i] === null) {
      return Promise.resolve([]);
    }
    return listDocuments(c, i.split('#')[0], cursor[i]);
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
      [logic[i][0]]: c
    }), {})
  };
};
