import assert from 'assert';
import get from 'lodash.get';
import set from 'lodash.set';
import isEqual from 'lodash.isequal';
import actionMap from '../resources/action-map.js';
import { fromCursor } from './paging.js';
import { buildQuery } from './filter.js';
import extractPrefix from './extract-prefix.js';

const splitPath = (fullPath, mapping, allowedFields) => {
  if (typeof fullPath !== 'string' || !fullPath.includes('.')) {
    return [fullPath, null];
  }
  if (mapping === null) {
    return [fullPath, extractPrefix(fullPath, allowedFields)];
  }
  let idx = 0;
  let cur = mapping.mappings;
  const fullPathSplit = fullPath.split('.');
  for (let i = 0; i < fullPathSplit.length; i += 1) {
    const segment = fullPathSplit[i];
    if (!('properties' in cur) || !(segment in cur.properties)) {
      break;
    }
    idx = i;
    cur = cur.properties[segment];
  }
  return [fullPath, idx === 0 ? null : fullPathSplit.splice(0, idx).join('.')];
};

export const build = (allowedFields, mapping, {
  toReturn = [''],
  filterBy = [],
  orderBy = [],
  scoreBy = [],
  searchAfter = [],
  limit,
  offset,
  cursor
}) => {
  assert(cursor === undefined || offset === undefined, 'Cannot override offset with cursor.');
  assert(Array.isArray(toReturn));
  const cursorPayload = cursor !== undefined ? fromCursor(cursor) : null;
  const result = {
    _source: toReturn,
    search_after: Array.isArray(searchAfter) && searchAfter.length !== 0
      ? searchAfter
      : get(cursorPayload, 'searchAfter', []),
    size: typeof limit === 'number' ? limit : get(cursorPayload, 'limit', 20),
    from: typeof offset === 'number' ? offset : get(cursorPayload, 'offset', 0)
  };
  // eslint-disable-next-line no-underscore-dangle
  assert(Array.isArray(result._source), 'Invalid toReturn provided.');
  assert(
    // eslint-disable-next-line no-underscore-dangle
    allowedFields === null || isEqual(toReturn, ['']) || result._source.every((f) => allowedFields.includes(f)),
    'Invalid field(s) provided.'
  );
  if (filterBy.length !== 0) {
    result.query = buildQuery(filterBy, allowedFields);
  }
  if (scoreBy.length !== 0) {
    set(result, 'query.bool.should', [
      { function_score: { script_score: { script: { source: '0' } }, query: { match_all: {} }, score_mode: 'max' } },
      ...scoreBy
        .map((s) => [
          extractPrefix(s[1], allowedFields),
          { function_score: actionMap.score[s[0]](s.slice(1), { allowedFields }) }
        ])
        .map(([path, query]) => (path !== '' ? ({ nested: { path, query, score_mode: 'max' } }) : query))
    ]);
  }
  const sort = [...orderBy];
  let addScore = scoreBy.length !== 0;
  let addId = true;
  for (let i = 0; i < sort.length; i += 1) {
    const [field, order] = sort[i];
    if (field === '_score' && ['asc', 'desc'].includes(order)) {
      addScore = false;
    }
    if (field === '_id' && ['asc', 'desc'].includes(order)) {
      addId = false;
    }
  }
  if (addScore) {
    sort.push(['_score', 'desc']);
  }
  if (addId) {
    sort.push(['_id', 'asc']);
  }
  result.sort = sort
    .map((e) => actionMap.order[e[1]]([...splitPath(e[0], mapping, allowedFields), ...e.slice(2)], { allowedFields }));
  if (result.search_after.length === 0) {
    delete result.search_after;
  }
  return result;
};
