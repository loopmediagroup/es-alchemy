// Translate model from esalchemy syntax to ES syntax
const assert = require('assert');
const fieldDefinitions = require('../resources/field-definitions');

const getFieldDef = (fieldType) => fieldDefinitions[
  fieldType.endsWith('[]') ? fieldType.slice(0, -2) : fieldType
];

module.exports = ({
  compile: (specs) => {
    assert(
      specs.fields instanceof Object && !Array.isArray(specs.fields),
      'Model definition expected to be of type object.'
    );
    Object.values(specs.fields).forEach((fieldType) => assert(
      typeof getFieldDef(fieldType) === 'function',
      `Unknown field type given: ${fieldType}`
    ));
    return {
      ...specs,
      fields: Object
        .entries(specs.fields)
        .reduce((prev, [key, value]) => Object.assign(prev, {
          [key]: getFieldDef(value)
        }), {})
    };
  }
});
