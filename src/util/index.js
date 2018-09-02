// Translate index from esalchemy syntax to ES syntax
const assert = require("assert");
const get = require("lodash.get");

const buildPropertiesRec = (node, models) => {
  assert(
    typeof node === "object" && Array.isArray(node) === false,
    "Invalid specs definition."
  );
  assert(
    Object.keys(node).every(e => ["model", "fields", "sources", "nested", "flat", "version"].includes(e)),
    "Unknown specs entry provided."
  );
  assert(
    typeof node.model === "string",
    "Model name not string."
  );
  assert(
    node.nested === undefined || (typeof node.nested === "object" && !Array.isArray(node.nested)),
    "Nested expected to be of type object."
  );
  assert(
    Array.isArray(node.fields),
    "Fields expected to be array."
  );
  const model = models[node.model.endsWith("[]") ? node.model.slice(0, -2) : node.model];
  assert(
    model !== undefined,
    "Model name not registered."
  );
  assert(
    node.fields.every(f => model.compiled.fields[f] !== undefined),
    "Unknown field provided."
  );
  const nested = Object.entries(node.nested || {});
  return nested.reduce(
    (prev, [key, value]) => Object.assign(prev, {
      [key]: Object.assign(
        { properties: buildPropertiesRec(value, models), type: "nested" },
        get(value, 'flat', false) === true ? { include_in_root: true } : {}
      )
    }),
    node.fields.reduce((prev, key) => Object.assign(prev, { [key]: model.compiled.fields[key] }), {})
  );
};

const extractFieldsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .map(([relName, childNode]) => extractFieldsRec(childNode, prefix.concat(relName)))
  .reduce(
    (p, c) => p.concat(c),
    node.fields.map(field => prefix.concat(field).join("."))
  );

const extractRelsRec = (node, prefix = []) => Object
  .entries(node.nested || {})
  .reduce((prev, [relName, childNode]) => {
    const childPrefix = prefix.concat(relName);
    return Object.assign(
      prev,
      { [childPrefix.join(".")]: childNode.model },
      extractRelsRec(childNode, childPrefix)
    );
  }, {});

module.exports = ({
  generateMapping: (name, specs, models) => {
    assert(
      !get(specs, "model", "").endsWith("[]"),
      "Root node can not be Array."
    );
    return {
      mappings: {
        [name]: {
          properties: buildPropertiesRec(specs, models),
          _meta: {
            version: specs.version || null
          }
        }
      }
    };
  },
  extractFields: specs => extractFieldsRec(specs),
  extractRels: spec => extractRelsRec(spec)
});
