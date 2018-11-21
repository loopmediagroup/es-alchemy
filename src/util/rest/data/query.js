const assert = require('assert');
const get = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');
const objectRewrite = require('object-rewrite');
const objectPaths = require('obj-paths');
const resultRemap = require('../../../resources/result-remap');

module.exports = (call, idx, mapping, filter, { raw = false }) => call('GET', `${idx}@*`, {
  body: (() => {
    // PART 1: workaround for https://github.com/elastic/elasticsearch/issues/23796
    const filterNew = cloneDeep(filter);
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source.push(...objectPaths.getParents(filterNew._source));
    return filterNew;
  })(),
  endpoint: '_search'
})
  .then((esResult) => {
    assert(esResult.statusCode === 200, JSON.stringify(esResult.body));
    assert(get(esResult.body, '_shards.failed') === 0, JSON.stringify(esResult.body));
    // PART 2: workaround for https://github.com/elastic/elasticsearch/issues/23796
    const rewriterFilter = objectRewrite({
      // eslint-disable-next-line no-underscore-dangle
      retain: filter._source.concat(filter._source.reduce((p, c) => p.concat(['object', 'geo_shape'].includes(get(
        mapping,
        // retain properties of type "object"
        `mappings.${[idx, ...c.split('.')].join('.properties.')}.type`
      )) ? `${c}.**` : []), []))
    });
    const rewriterOverwrite = objectRewrite({
      // eslint-disable-next-line no-underscore-dangle
      overwrite: filter._source
        .map(f => [f, get(mapping, `mappings.${[idx, ...f.split('.')].join('.properties.')}.type`)])
        .filter(f => f[1] !== undefined)
        .reduce((p, [field, fieldMapping]) => Object.assign(p, {
          [field]: (key, value, parents) => resultRemap[fieldMapping](value)
        }), {})
    });
    esResult.body.hits.hits.forEach((r) => {
      // eslint-disable-next-line no-underscore-dangle
      rewriterFilter(r._source);
      // eslint-disable-next-line no-underscore-dangle
      rewriterOverwrite(r._source);
    });
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
