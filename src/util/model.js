// Translate model from esalchemy syntax to ES syntax
const assert = require("assert");
const fieldDefinitions = require("../resources/field-definitions");

module.exports = ({
  compile: (specs) => {
    assert(typeof specs.fields === "object" && !Array.isArray(specs.fields));
    return Object.assign({}, specs, {
      fields: Object
        .entries(specs.fields)
        .reduce((prev, [key, value]) => Object.assign(prev, { [key]: fieldDefinitions[value] }), {})
    });
  }
});
