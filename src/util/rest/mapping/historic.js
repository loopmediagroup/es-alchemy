const get = require('lodash.get');

// return old index versions with count
module.exports = (call, idx, mapping) => call(
  'GET',
  // eslint-disable-next-line no-underscore-dangle
  `${idx}@*,-${idx}@${mapping.mappings[idx]._meta.hash}`,
  { endpoint: '_stats/docs' }
)
  .then((r) => Object.entries(get(r, 'body.indices', {}))
    .reduce((p, [k, v]) => Object.assign(p, { [k]: get(v, 'total.docs.count', 0) }), {}));
