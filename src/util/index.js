// Translate index from esalchemy syntax to ES syntax
const assert = require('assert');
const get = require('lodash.get');
const objectHash = require('object-hash');

const buildPropertiesRec = (node, models) => {
  assert(
    node instanceof Object && Array.isArray(node) === false,
    'Invalid specs definition.'
  );
  assert(
    Object.keys(node).every((e) => ['model', 'fields', 'sources', 'nested', 'flat'].includes(e)),
    'Unknown specs entry provided.'
  );
  assert(
    typeof node.model === 'string',
    'Model name not string.'
  );
  assert(
    node.nested === undefined || (node.nested instanceof Object && !Array.isArray(node.nested)),
    'Nested expected to be of type object.'
  );
  assert(
    Array.isArray(node.fields),
    'Fields expected to be array.'
  );
  const model = models[node.model.endsWith('[]') ? node.model.slice(0, -2) : node.model];
  assert(
    model !== undefined,
    'Model name not registered.'
  );
  assert(
    node.fields.every((f) => typeof model.compiled.fields[typeof f === 'string' ? f : f.name] === 'function'),
    'Unknown field provided.'
  );
  const nested = Object.entries(node.nested || {});
  return nested.reduce(
    (prev, [key, value]) => Object.assign(prev, {
      [key]: {
        properties: buildPropertiesRec(value, models),
        type: 'nested',
        ...(get(value, 'flat', false) === true ? { include_in_root: true } : {})
      }
    }),
    node.fields
      .reduce((prev, key) => {
        const isString = typeof key === 'string';
        const k = isString ? key : key.name;
        // eslint-disable-next-line no-param-reassign
        prev[k] = model.compiled.fields[k](...(isString ? [] : [get(key, 'overwrite', {})]));
        return prev;
      }, {})
  );
};

const extractFieldsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .map(([relName, childNode]) => extractFieldsRec(childNode, prefix.concat(relName)))
  .reduce(
    (p, c) => p.concat(c),
    node.fields.map((field) => prefix.concat(typeof field === 'string' ? field : field.name).join('.'))
  );

const extractRelsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .reduce((prev, [relName, childNode]) => {
    const childPrefix = prefix.concat(relName);
    return Object.assign(
      prev,
      { [childPrefix.join('.')]: childNode.model },
      extractRelsRec(childNode, childPrefix)
    );
  }, {});

module.exports = ({
  generateMapping: (name, specs, models) => {
    assert(
      !get(specs, 'model', '').endsWith('[]'),
      'Root node can not be Array.'
    );
    assert(
      Object.keys(specs).every((e) => [
        'model', 'fields', 'sources', 'nested', 'flat', 'settings'
      ].includes(e)),
      'Bad index definition provided.'
    );
    const properties = buildPropertiesRec({
      model: specs.model,
      fields: specs.fields,
      sources: specs.sources,
      nested: specs.nested,
      flat: specs.flat
    }, models);
    const def = {
      dynamic: 'false',
      properties,
      _meta: {}
    };
    const result = { mappings: def };
    if (specs.settings !== undefined) {
      result.settings = specs.settings;
    }
    // todo: remove if case (breaking)
    if (Object.keys(result).length === 1 && result.mappings !== undefined) {
      // eslint-disable-next-line no-underscore-dangle
      def._meta.hash = objectHash(result.mappings);
    } else {
      // eslint-disable-next-line no-underscore-dangle
      def._meta.hash = objectHash(result);
    }
    return result;
  },
  extractFields: (specs) => extractFieldsRec(specs),
  extractRels: (spec) => extractRelsRec(spec)
});
