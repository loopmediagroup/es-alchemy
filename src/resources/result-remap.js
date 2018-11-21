const fieldDefinitions = require('./field-definitions');

const identity = v => v;

module.exports.definitions = Object.entries(fieldDefinitions)
  .reduce((p, c) => Object.assign(p, { [c[1].type]: c[0] }), {});

module.exports.remap = {
  date: identity,
  boolean: identity,
  integer: identity,
  uuid: identity,
  keyword: identity,
  point: identity,
  shape: v => (v !== null ? v.coordinates[0] : null),
  datetime: identity,
  string: identity,
  enum: identity,
  object: identity
};
