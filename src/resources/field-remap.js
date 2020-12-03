const identity = (v) => v;

module.exports = {
  date: identity,
  boolean: identity,
  integer: identity,
  uuid: identity,
  id: identity,
  keyword: identity,
  point: (v) => (v ? [v[0], v[1]] : null),
  shape: (v) => (v ? {
    type: 'Polygon',
    coordinates: [v]
  } : null),
  datetime: identity,
  string: identity,
  enum: identity,
  object: (v) => [v],
  folded: identity
};
