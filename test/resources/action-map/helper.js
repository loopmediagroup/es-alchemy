const get = require('lodash.get');
const { search } = require('../../../src/resources/action-map/filter');

module.exports = (q) => {
  const result = search('name', q);
  const ws = get(result, 'bool.filter');
  return ws.map((w) => get(w, 'wildcard.name.value'));
};
