const assert = require('assert');
const get = require('lodash.get');
const set = require('lodash.set');
const isEqual = require('lodash.isequal');
const actionMap = require('../resources/action-map');
const { fromCursor } = require('../util/paging');
const { buildQuery } = require('./filter');

module.exports.build = (allowedFields, {
  toReturn = [''],
  filterBy = [],
  orderBy = [],
  scoreBy = [],
  limit,
  offset,
  cursor
}) => {
  assert(cursor === undefined || offset === undefined, 'Cannot override offset with cursor.');
  assert(Array.isArray(toReturn));
  const cursorPayload = cursor !== undefined ? fromCursor(cursor) : null;
  const { size, from } = {
    size: typeof limit === 'number' ? limit : get(cursorPayload, 'limit', 20),
    from: typeof offset === 'number' ? offset : get(cursorPayload, 'offset', 0)
  };
  const result = {
    _source: toReturn,
    size,
    from
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
          s[1].substring(0, s[1].lastIndexOf('.')),
          { function_score: actionMap.score[s[0]](s.slice(1), { allowedFields }) }
        ])
        .map(([path, query]) => (path !== '' ? ({ nested: { path, query, score_mode: 'max' } }) : query))
    ]);
  }
  result.sort = [
    ...orderBy,
    ...(scoreBy.length !== 0 ? [['_score', 'desc', null]] : []),
    ...(get(orderBy.slice(-1), '[0][0]') === 'id' && ['asc', 'desc'].includes(get(orderBy.slice(-1), '[0][1]'))
      ? []
      : [['id', 'asc']])
  ]
    .map((e) => actionMap.order[e[1]]([e[0], ...e.slice(2)], { allowedFields }));
  return result;
};
