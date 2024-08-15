// Translate index from esalchemy syntax to ES syntax
import assert from 'assert';
import get from 'lodash.get';
import objectHash from 'object-hash';
import objectScan from 'object-scan';

const buildPropertiesRec = (node, models, exclude) => {
  assert(
    node instanceof Object && Array.isArray(node) === false,
    'Invalid specs definition.'
  );
  assert(
    Object.keys(node).every((e) => ['model', 'type', 'fields', 'sources', 'nested', 'flat'].includes(e)),
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
    node.type === undefined || typeof node.type === 'string',
    'Invalid type field provided'
  );
  assert(
    node.fields.every((f) => typeof model.compiled.fields[typeof f === 'string' ? f : f.name] === 'function'),
    'Unknown field provided.'
  );
  const nested = Object.entries(node.nested || {});
  return nested
    .filter(([_, value]) => !exclude.includes(value.type))
    .reduce(
      (prev, [key, value]) => Object.assign(prev, {
        [key]: {
          properties: buildPropertiesRec(value, models, exclude),
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

export const generateMapping = (name, specs, models, exclude = []) => {
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
  }, models, exclude);
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
};

const extractFieldsScanner = objectScan([
  '**{nested.*}.fields[*]',
  '**{nested.*}.fields[*].name',
  '**{nested.*}.fields[*].overwrite.fields.*.type'
], {
  filterFn: ({ isLeaf }) => isLeaf,
  breakFn: ({ value, context }) => context.exclude.includes(value?.type),
  rtn: ({ key, value, getParents }) => {
    const result = [];
    let i = 0;
    while (key[i] !== 'fields') {
      result.push(key[i + 1]);
      i += 2;
    }
    if (key.length - i === 6) {
      const parents = getParents();
      result.push(`${parents[3].name}$${key[key.length - 2]}`);
    } else {
      result.push(value);
    }
    return result.join('.');
  },
  afterFn: ({ result }) => result.reverse()
});

export const extractFields = (specs, exclude = []) => extractFieldsScanner(specs, { exclude });
export const extractRels = (spec) => extractRelsRec(spec);
export const normalize = (field) => field.replace('$', '.');
