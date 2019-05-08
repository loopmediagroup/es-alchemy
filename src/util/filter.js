const assert = require('assert');
const actionMap = require('../resources/action-map');

const buildRec = (filterBy, allowedFields) => {
  // handle actual filter clause
  if (Array.isArray(filterBy)) {
    assert(
      allowedFields === null || allowedFields.includes(filterBy[0]),
      'Unexpected field in filter.'
    );
    return [
      filterBy[0].substring(0, filterBy[0].lastIndexOf('.')),
      actionMap.filter[filterBy[1]](filterBy[0], ...filterBy.slice(2))
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
    const [prefix, logic] = buildRec(typeof filter === 'string' ? filter.split(' ') : filter, allowedFields);
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
      results.push(actionMap.filter.nest(prefix, logics));
    } else {
      logics.forEach((logic) => {
        results.push(actionMap.filter.nest(prefix, [logic]));
      });
    }
  });
  return ['', actionMap.bool[clause](clause === 'not' ? results[0] : results)];
};

module.exports.buildQuery = buildRec;
