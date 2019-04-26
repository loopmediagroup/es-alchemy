const assert = require('assert');
const get = require('lodash.get');
const objectScan = require('object-scan');
const objectPaths = require('obj-paths');
const resultRemap = require('../../../resources/result-remap');

module.exports = (call, idx, specs, mapping, filter) => call('GET', `${idx}@*`, {
  body: filter,
  endpoint: '_search'
})
  .then((esResult) => {
    assert(esResult.statusCode === 200, JSON.stringify(esResult.body));
    assert(get(esResult.body, '_shards.failed') === 0, JSON.stringify(esResult.body));
    const rewriterRemap = (() => {
      // eslint-disable-next-line no-underscore-dangle
      const resultRemaps = filter._source
        .map(f => [f, get(mapping, `mappings.${[idx, ...f.split('.')].join('.properties.')}.type`)])
        .filter(f => f[1] !== undefined)
        .reduce((p, [field, fieldMapping]) => Object.assign(p, {
          [field]: e => resultRemap[fieldMapping](e)
        }), {});
      return input => objectScan(Object.keys(resultRemaps), {
        joined: false,
        useArraySelector: false,
        filterFn: (key, value, { matchedBy }) => {
          const lastStringIndex = key.reduce((p, c, i) => (typeof c === 'string' ? i : p), 0);
          const targetKey = key.slice(0, lastStringIndex + 1);
          const parent = targetKey.length === 1 ? input : get(input, targetKey.slice(0, -1));
          matchedBy.forEach((m) => {
            parent[targetKey[targetKey.length - 1]] = resultRemaps[m](parent[targetKey[targetKey.length - 1]]);
          });
          return true;
        }
      })(input);
    })();
    // workaround for https://github.com/elastic/elasticsearch/issues/23796
    const injectArrays = (() => {
      // eslint-disable-next-line no-underscore-dangle
      const arrays = objectPaths.getParents(filter._source)
        .map(e => e.split('.'))
        .filter(e => get(specs, `nested.${e.join('.nested.')}.model`).endsWith('[]'))
        .reduce((p, c) => {
          const key = c.slice(0, -1).join('.');
          const value = c.slice(-1).join('.');
          return Object.assign(p, { [key]: (p[key] || []).concat(value) });
        }, {});
      return input => objectScan(Object.keys(arrays), {
        filterFn: (key, value, { matchedBy }) => {
          matchedBy.forEach((m) => {
            arrays[m].forEach((e) => {
              if (value[e] === undefined) {
                // eslint-disable-next-line no-param-reassign
                value[e] = [];
              }
            });
          });
        }
      })(input);
    })();
    esResult.body.hits.hits.forEach((r) => {
      // eslint-disable-next-line no-underscore-dangle
      rewriterRemap(r._source);
      // eslint-disable-next-line no-underscore-dangle
      injectArrays(r._source);
    });
    return esResult.body;
  });
