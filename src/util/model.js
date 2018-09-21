// Translate model from esalchemy syntax to ES syntax
const assert = require("assert");
const fieldDefinitions = require("../resources/field-definitions");

module.exports = ({
  compile: (specs) => {
    assert(
      typeof specs.fields === "object" && !Array.isArray(specs.fields),
      "Model definition expected to be of type object."
    );
    assert(
      Object.values(specs.fields).every(f => fieldDefinitions[f.endsWith("[]") ? f.slice(0, -2) : f] !== undefined),
      "Unknown field type given."
    );
    return Object.assign({}, specs, {
      fields: Object
        .entries(specs.fields)
        .reduce((prev, [key, value]) => Object.assign(prev, {
          [key]: fieldDefinitions[value.endsWith("[]") ? value.slice(0, -2) : value]
        }), {})
    });
  }
});
