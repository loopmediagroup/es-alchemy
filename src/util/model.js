// Translate model from esalchemy syntax to ES syntax
const assert = require('assert');
const fieldDefinitions = require('../resources/field-definitions');

module.exports = ({
  compile: (specs) => {
    assert(
      specs.fields instanceof Object && !Array.isArray(specs.fields),
      'Model definition expected to be of type object.'
    );
    Object.values(specs.fields).forEach(fieldType => assert(
      fieldDefinitions[fieldType.endsWith('[]') ? fieldType.slice(0, -2) : fieldType] !== undefined,
      `Unknown field type given: ${fieldType}`
    ));
    return Object.assign({}, specs, {
      fields: Object
        .entries(specs.fields)
        .reduce((prev, [key, value]) => Object.assign(prev, {
          [key]: fieldDefinitions[value.endsWith('[]') ? value.slice(0, -2) : value]
        }), {})
    });
  }
});
