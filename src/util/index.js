// Translate index from esalchemy syntax to ES syntax
const assert = require("assert");
const get = require("lodash.get");

const buildPropertiesRec = (specs, models) => {
  assert(typeof specs.model === "string");
  assert(specs.nested === undefined || (typeof specs.nested === "object" && !Array.isArray(specs.nested)));
  assert(Array.isArray(specs.fields));
  const model = models[specs.model.endsWith("[]") ? specs.model.slice(0, -2) : specs.model];
  assert(model !== undefined);
  assert(specs.fields.every(f => model.compiled.fields[f] !== undefined));
  const nested = Object.entries(specs.nested || {});
  return nested.reduce(
    (prev, [key, value]) => Object.assign(prev, {
      [key]: Object.assign(
        { properties: buildPropertiesRec(value, models), type: "nested" },
        get(value, 'flat', false) === true ? { include_in_root: true } : {}
      )
    }),
    specs.fields.reduce((prev, key) => Object.assign(prev, { [key]: model.compiled.fields[key] }), {})
  );
};

module.exports = ({
  generateMapping: (name, specs, models) => ({
    mappings: {
      [name]: {
        properties: buildPropertiesRec(specs, models)
      }
    }
  })
});
