import assert from 'assert';
import get from 'lodash.get';
import cloneDeep from 'lodash.clonedeep';
import objectScan from 'object-scan';
import { getParents, Retainer } from 'object-fields';
import fieldDefinitions from '../../../resources/field-definitions.js';

export default ({
  call, idx, rels, specs, models, filter
}) => call('GET', idx, {
  body: (() => {
    // PART 1: workaround for https://github.com/elastic/elasticsearch/issues/23796
    // inject id requests for all entries
    const filterNew = cloneDeep(filter);
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source.push(...getParents(filterNew._source).map((p) => `${p}.id`));
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source = [...new Set(filterNew._source)].sort();
    // eslint-disable-next-line no-underscore-dangle
    filterNew._source = filterNew._source.filter((f) => f !== '_id');
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
        .map((f) => {
          if (specs === null || f === '_id' || f === '') {
            return [f, undefined];
          }
          const pth = f.split('.');
          const name = pth.pop();
          const model = pth.length === 0 ? specs.model : get(specs, `nested.${pth.join('.nested.')}`).model;
          const type = models[model.endsWith('[]') ? model.slice(0, -2) : model].specs.fields[name];
          const { meta } = fieldDefinitions[type.endsWith('[]') ? type.slice(0, -2) : type];
          return [f, meta];
        })
        .filter((f) => f[1] !== undefined)
        .reduce((p, [field, meta]) => Object.assign(p, {
          [field]: (e) => meta.unmarshall(e)
        }), {});
      const scanner = objectScan(Object.keys(resultRemaps), {
        useArraySelector: false,
        breakFn: ({ matchedBy, parent, property }) => {
          if (matchedBy.length !== 0) {
            assert(matchedBy.length === 1);
            // eslint-disable-next-line no-param-reassign
            parent[property] = resultRemaps[matchedBy[0]](parent[property]);
            return true;
          }
          return false;
        }
      });
      return (input) => scanner(input);
    })();
    // PART 2: workaround for https://github.com/elastic/elasticsearch/issues/23796
    // inject empty arrays where no results
    const injectArrays = (() => {
      // eslint-disable-next-line no-underscore-dangle
      const arrays = getParents(filter._source)
        .filter((e) => rels[e].endsWith('[]'))
        .map((e) => e.split('.'))
        .reduce((p, c) => {
          const key = c.slice(0, -1).join('.');
          const value = c.slice(-1).join('.');
          return Object.assign(p, { [key]: (p[key] || []).concat(value) });
        }, {});
      const scanner = objectScan(Object.keys(arrays), {
        useArraySelector: false,
        filterFn: ({ value, matchedBy }) => {
          matchedBy.forEach((m) => {
            arrays[m].forEach((e) => {
              if (value[e] === undefined) {
                // eslint-disable-next-line no-param-reassign
                value[e] = [];
              }
            });
          });
        }
      });
      return (input) => scanner(input);
    })();
    // eslint-disable-next-line no-underscore-dangle
    const retainResult = Retainer(filter._source);
    esResult.body.hits.hits.forEach((r) => {
      // eslint-disable-next-line no-underscore-dangle,no-param-reassign
      r._source._id = r._id;
      // eslint-disable-next-line no-underscore-dangle
      rewriterRemap(r._source);
      // eslint-disable-next-line no-underscore-dangle
      injectArrays(r._source);
      // PART 3: workaround for https://github.com/elastic/elasticsearch/issues/23796
      // filter injected ids out for final result
      // eslint-disable-next-line no-underscore-dangle
      retainResult(r._source);
    });
    return esResult.body;
  });
