// Convert raw data into index ready data
const assert = require('assert');
const fieldRemap = require('../resources/field-remap');
const { buildPageObject } = require('./paging');

const remapRec = (specs, input, models) => {
  const result = [];
  assert(
    specs.sources === undefined || (Array.isArray(specs.sources) && specs.sources.length !== 0),
    'Invalid sources definition.'
  );
  (specs.sources || [''])
    // resolve to all objects for path
    .map((sourcePath) => (sourcePath === '' ? input : sourcePath.split('.').reduce(
      (origins, segment) => origins
        .map((origin) => origin[segment])
        .filter((origin) => !!origin)
        .reduce((prev, next) => prev.concat(Array.isArray(next) ? next : [next]), []),
      [input]
    )))
    // filter invalid origins
    .filter((origins) => !!origins)
    // ensure origins are array
    .map((origins) => (Array.isArray(origins) ? origins : [origins]))
    // extract recursively
    .forEach((origins) => origins.forEach((origin) => {
      const entry = {};
      const fieldTypes = models[specs.model.endsWith('[]') ? specs.model.slice(0, -2) : specs.model].specs.fields;
      specs.fields // handle top level
        .map((field) => [field, origin[field]])
        .filter((kv) => kv[1] !== undefined)
        .reduce((prev, [key, value]) => Object.assign(prev, {
          [key]: fieldRemap[fieldTypes[key].endsWith('[]') ? fieldTypes[key].slice(0, -2) : fieldTypes[key]](value)
        }), entry);
      Object.entries(specs.nested || {}) // handle nested
        .map(([key, value]) => [key, remapRec(value, origin, models)])
        .filter((kv) => kv[1] !== undefined)
        .reduce((prev, [key, value]) => Object.assign(prev, { [key]: value }), entry);
      result.push(entry);
    }));
  assert(
    specs.model.endsWith('[]') || result.length <= 1,
    'More than one result for relationship.'
  );
  return specs.model.endsWith('[]') ? result : result[0];
};

module.exports.remap = (specs, input, models) => remapRec(specs, input, models);
module.exports.page = (esResultBody, filter) => ({
  // eslint-disable-next-line no-underscore-dangle
  payload: esResultBody.hits.hits.map((r) => r._source),
  page: buildPageObject(esResultBody.hits.hits.length, esResultBody.hits.total, filter.size, filter.from)
});
