const identity = (v) => v;

module.exports = {
  date: identity,
  boolean: identity,
  long: identity,
  keyword: identity,
  geo_point: identity,
  geo_shape: (v) => (v !== null ? v.coordinates[0] : null),
  text: identity,
  enum: identity,
  object: (v) => v[0]
};
