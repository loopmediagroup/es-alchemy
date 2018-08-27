const assert = require('assert');
const get = require("lodash.get");
const isEqual = require("lodash.isequal");
const actionMap = require("../resources/action-map");

const buildQueryRec = (filterBy) => {
  // handle actual filter clause
  if (Array.isArray(filterBy)) {
    return [
      filterBy[0].substring(0, filterBy[0].lastIndexOf('.')),
      actionMap.filter[filterBy[1]](filterBy[0], ...filterBy.slice(2))
    ];
  }

  // handle "or" and "and" clauses
  assert(typeof filterBy === "object" && !Array.isArray(filterBy));
  assert(Object.keys(filterBy).length === 1);
  const [clause, filters] = Object.entries(filterBy)[0];
  assert(["or", "and"].includes(clause));

  // handle clause content recursively
  const groups = {};
  filters.forEach((filter) => {
    assert(["string", "object"].includes(typeof filter));
    const [prefix, logic] = buildQueryRec(typeof filter === 'string' ? filter.split(" ") : filter);
    if (groups[prefix] === undefined) {
      groups[prefix] = [];
    }
    groups[prefix].push(logic);
  });

  // create final clause and return
  const results = [];
  results.push(...(groups[""] || []));
  delete groups[""];
  Object.entries(groups).forEach(([prefix, logics]) => {
    if (clause === "and") {
      results.push(actionMap.filter.nest(prefix, logics));
    } else { // or clause
      logics.forEach((logic) => {
        results.push(actionMap.filter.nest(prefix, [logic]));
      });
    }
  });
  return ["", actionMap.filter[clause](results)];
};

module.exports.build = ({
  toReturn = [""],
  filterBy = [],
  orderBy = [],
  scoreBy = [],
  limit = 20,
  offset = 0
}) => {
  const result = {
    _source: toReturn,
    size: limit,
    from: typeof offset === "number" ? offset : 0
  };
  if (filterBy.length !== 0) {
    result.query = buildQueryRec(filterBy)[1];
  }
  result.sort = orderBy
    .concat(isEqual(orderBy.slice(-1), [["id", "asc"]]) ? [] : [["id", "asc"]])
    .map(e => actionMap.order[e[1]](e[0], ...e.slice(2)));
  if (scoreBy.length !== 0) {
    result.query = {
      function_score: {
        query: get(result, 'query', { match_all: {} }),
        functions: scoreBy.map(e => actionMap.score[e[0]](...e.slice(1))),
        score_mode: "sum",
        boost_mode: "replace"
      }
    };
    result.sort.push({ _score: { order: "desc" } });
  }
  return result;
};
