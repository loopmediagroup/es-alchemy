const assert = require("assert");
const get = require("lodash.get");

module.exports = (call, idx, filter, { raw = false }) => call('GET', idx, { body: filter, endpoint: "_search" })
  .then((esResult) => {
    assert(esResult.statusCode === 200, JSON.stringify(esResult.body));
    assert(get(esResult.body, '_shards.failed') === 0, JSON.stringify(esResult.body));
    return raw === true
      ? esResult.body
      : {
        // eslint-disable-next-line no-underscore-dangle
        payload: esResult.body.hits.hits.map(r => r._source),
        page: {
          next: esResult.body.hits.hits.length === filter.size ? {
            limit: filter.size,
            offset: filter.from + filter.size
          } : null,
          prev: filter.from > 0 ? {
            limit: filter.size,
            offset: Math.max(0, filter.from - filter.size)
          } : null,
          cur: 1 + Math.ceil(filter.from * 1.0 / filter.size),
          size: filter.size
        }
      };
  });
