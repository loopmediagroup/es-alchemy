const get = require('lodash.get');

module.exports = (call, idx, mapping) => call('POST', '', {
  endpoint: '_aliases',
  body: {
    actions: [
      { remove: { index: `${idx}@*`, alias: idx } },
      // eslint-disable-next-line no-underscore-dangle
      { add: { index: `${idx}@${mapping.mappings._meta.hash}`, alias: idx } }
    ]
  }
})
  .then((r) => r.statusCode === 200 && get(r, 'body.acknowledged', false) === true);
