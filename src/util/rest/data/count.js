const get = require('lodash.get');

module.exports = (call, idx) => call('POST', `${idx}@*`, { endpoint: '_count' })
  .then(r => (r.statusCode === 200 && get(r, 'body._shards.total', 0) !== 0 ? r.body.count : false));
