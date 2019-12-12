const get = require('lodash.get');

// eslint-disable-next-line no-underscore-dangle
module.exports = (call, idx, mapping, id) => call('GET', `${idx}@${mapping.mappings[idx]._meta.hash}`, {
  endpoint: `${idx}/${id}?_source=false`
})
  .then((r) => get(r, 'body._version', null));
