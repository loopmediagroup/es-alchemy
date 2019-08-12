const assert = require('assert');
const get = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');
const objectScan = require('object-scan');
const objectFields = require('object-fields');
const resultRemap = require('../../../resources/result-remap');

module.exports = (call, idx, rels, mapping, filter) => call('GET', `${idx}@*`, {
  body: (() => {
    // PART 1: workaround for https://github.com/elastic/elasticsearch/issues/23796
    // inject id requests for all entries
    const filterNew = cloneDeep(filter);
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source.push(...objectFields.getParents(filterNew._source).map((p) => `${p}.id`));
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source = [...new Set(filterNew._source)].sort();
    return filterNew;
  })(),
  endpoint: '_search'
})
  .then((esResult) => {
    assert(esResult.statusCode === 200, JSON.stringify(esResult.body));
    assert(get(esResult.body, '_shards.failed') === 0, JSON.stringify(esResult.body));
    const rewriterRemap = (() => {
      // eslint-disable-next-line no-underscore-dangle
      const resultRemaps = filter._source
        .map((f) => [f, get(mapping, `mappings.${[idx, ...f.split('.')].join('.properties.')}.type`)])
        .filter((f) => f[1] !== undefined)
        .reduce((p, [field, fieldMapping]) => Object.assign(p, {
          [field]: (e) => resultRemap[fieldMapping](e)
        }), {});
      return (input) => objectScan(Object.keys(resultRemaps), {
        joined: false,
        useArraySelector: false,
        breakFn: (key, value, { isMatch, matchedBy, parents }) => {
          if (isMatch) {
            const parent = key.length === 1 ? input : parents[0];
            matchedBy.forEach((m) => {
              parent[key[key.length - 1]] = resultRemaps[m](parent[key[key.length - 1]]);
            });
            return true;
          }
          return false;
        }
      })(input);
    })();
    // PART 2: workaround for https://github.com/elastic/elasticsearch/issues/23796
    // inject empty arrays where no results
    const injectArrays = (() => {
      // eslint-disable-next-line no-underscore-dangle
      const arrays = objectFields.getParents(filter._source)
        .filter((e) => rels[e].endsWith('[]'))
        .map((e) => e.split('.'))
        .reduce((p, c) => {
          const key = c.slice(0, -1).join('.');
          const value = c.slice(-1).join('.');
          return Object.assign(p, { [key]: (p[key] || []).concat(value) });
        }, {});
      return (input) => objectScan(Object.keys(arrays), {
        joined: false,
        useArraySelector: false,
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
      // PART 3: workaround for https://github.com/elastic/elasticsearch/issues/23796
      // filter injected ids out for final result
      // eslint-disable-next-line no-underscore-dangle
      objectFields.retain(r._source, filter._source);
    });
    return esResult.body;
  });
