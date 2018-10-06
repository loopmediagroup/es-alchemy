const assert = require("assert");
const get = require("lodash.get");
const set = require("lodash.set");
const cloneDeep = require("lodash.clonedeep");
const objectScan = require('object-scan');
const objectPaths = require('obj-paths');

module.exports = (call, idx, filter, { raw = false }) => call('GET', idx, {
  body: (() => {
    // PART 1: workaround for https://github.com/elastic/elasticsearch/issues/23796
    const filterNew = cloneDeep(filter);
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source.push(...objectPaths.getParents(filterNew._source));
    return filterNew;
  })(),
  endpoint: "_search"
})
  .then((esResult) => {
    assert(esResult.statusCode === 200, JSON.stringify(esResult.body));
    assert(get(esResult.body, '_shards.failed') === 0, JSON.stringify(esResult.body));
    // PART 2: workaround for https://github.com/elastic/elasticsearch/issues/23796
    // eslint-disable-next-line no-underscore-dangle
    const scanner = objectScan(filter._source, { useArraySelector: false, joined: false });
    set(esResult, "body.hits.hits", esResult.body.hits.hits
      // eslint-disable-next-line no-underscore-dangle
      .map(r => set(r, "_source", scanner(r._source).reduce((p, k) => set(p, k, get(r._source, k)), {}))));
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
          max: Math.max(1, 1 + Math.floor((esResult.body.hits.total - 0.1) / filter.size)),
          size: filter.size
        }
      };
  });
