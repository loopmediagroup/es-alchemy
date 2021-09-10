const assert = require('assert');
const get = require('lodash.get');

module.exports = (call, idx, filter = null) => {
  assert(
    // eslint-disable-next-line no-underscore-dangle
    filter === null || (filter._source.length === 1 && filter._source[0] === ''),
    'Can not return fields from filter'
  );
  return call('POST', idx, {
    endpoint: '_count',
    body: filter !== null ? { query: filter.query } : {}
  })
    .then((r) => (r.statusCode === 200 && get(r, 'body._shards.total', 0) !== 0 ? r.body.count : false));
};
