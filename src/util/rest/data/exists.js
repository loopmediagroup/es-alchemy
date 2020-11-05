const assert = require('assert');
const get = require('lodash.get');

module.exports = (call, idx, id) => call('GET', idx, {
  endpoint: '_count',
  body: { query: { match: { _id: id } } }
})
  .then((r) => {
    const count = get(r, 'body.count');
    assert(Number.isInteger(count));
    return count > 0;
  });
