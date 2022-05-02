import get from 'lodash.get';

export default (call, idx, filter = null) => call('POST', idx, {
  endpoint: '_count',
  body: filter !== null ? { query: filter.query } : {}
})
  .then((r) => (r.statusCode === 200 && get(r, 'body._shards.total', 0) !== 0 ? r.body.count : false));
