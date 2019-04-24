const assert = require('assert');
const get = require('lodash.get');
const isEqual = require('lodash.isequal');
const objectPaths = require('obj-paths');
const actionMapBool = require('../resources/action-map/bool');
const actionMapFilter = require('../resources/action-map/filter');
const actionMapOrder = require('../resources/action-map/order');
const actionMapScore = require('../resources/action-map/score');
const { fromCursor } = require('../util/paging');

const buildQueryRec = (filterBy, allowedFields) => {
  // handle actual filter clause
  if (Array.isArray(filterBy)) {
    assert(
      allowedFields === null || allowedFields.includes(filterBy[0]),
      'Unexpected field in filter.'
    );
    return [
      filterBy[0].substring(0, filterBy[0].lastIndexOf('.')),
      actionMapFilter[filterBy[1]](filterBy[0], ...filterBy.slice(2))
    ];
  }

  // handle "or" and "and" clauses
  assert(
    typeof filterBy === 'object' && !Array.isArray(filterBy),
    'Filter clause expected to be of type object.'
  );
  const filterKeys = Object.keys(filterBy);
  assert(
    ['["or"]', '["and"]', '["and","target"]', '["not"]'].includes(JSON.stringify(filterKeys.sort())),
    'Invalid filter clause provided.'
  );
  const clause = filterKeys.filter(e => e !== 'target')[0];
  const filters = clause === 'not' ? [filterBy[clause]] : filterBy[clause];
  const target = filterBy.target || 'separate';
  assert(['separate', 'union'].includes(target));

  // handle clause content recursively
  const groups = {};
  filters.forEach((filter) => {
    assert(
      ['string', 'object'].includes(typeof filter),
      'Filter clause entries expected to be string, array or object.'
    );
    const [prefix, logic] = buildQueryRec(typeof filter === 'string' ? filter.split(' ') : filter, allowedFields);
    if (groups[prefix] === undefined) {
      groups[prefix] = [];
    }
    groups[prefix].push(logic);
  });

  // create final clause and return
  const results = [];
  results.push(...(groups[''] || []));
  delete groups[''];
  Object.entries(groups).forEach(([prefix, logics]) => {
    if (clause === 'and' && target === 'separate') {
      results.push(actionMapFilter.nest(prefix, logics));
    } else {
      logics.forEach((logic) => {
        results.push(actionMapFilter.nest(prefix, [logic]));
      });
    }
  });
  return ['', actionMapBool[clause](clause === 'not' ? results[0] : results)];
};

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
  const cursorPayload = cursor !== undefined ? fromCursor(cursor) : null;
  const { size, from } = {
    size: typeof limit === 'number' ? limit : get(cursorPayload, 'limit', 20),
    from: typeof offset === 'number' ? offset : get(cursorPayload, 'offset', 0)
  };
  const result = {
    _source: typeof toReturn === 'string' ? objectPaths.split(toReturn) : toReturn,
    size,
    from
  };
  // eslint-disable-next-line no-underscore-dangle
  assert(Array.isArray(result._source), 'Invalid toReturn provided.');
  assert(
    // eslint-disable-next-line no-underscore-dangle
    allowedFields === null || isEqual(toReturn, ['']) || result._source.every(f => allowedFields.includes(f)),
    'Invalid field(s) provided.'
  );
  if (filterBy.length !== 0) {
    result.query = buildQueryRec(filterBy, allowedFields)[1];
  }
  if (scoreBy.length !== 0) {
    result.query = {
      function_score: {
        query: get(result, 'query', { match_all: {} }),
        functions: scoreBy.map(e => actionMapScore[e[0]](...e.slice(1))),
        score_mode: 'sum',
        boost_mode: 'replace'
      }
    };
  }
  result.sort = [
    ...orderBy,
    ...(scoreBy.length !== 0 ? [['_score', 'desc', null]] : []),
    ...(get(orderBy.slice(-1), '[0][0]') === 'id' && ['asc', 'desc'].includes(get(orderBy.slice(-1), '[0][1]'))
      ? []
      : [['id', 'asc']])
  ]
    .map(e => actionMapOrder[e[1]](e[0], ...e.slice(2)));
  return result;
};
