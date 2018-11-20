const identity = v => v;

module.exports = {
  date: identity,
  boolean: identity,
  integer: identity,
  uuid: identity,
  keyword: identity,
  point: v => (v ? {
    type: 'Point',
    coordinates: v
  } : null),
  shape: v => (v ? {
    type: 'Polygon',
    coordinates: [v]
  } : null),
  datetime: identity,
  string: identity,
  enum: identity,
  object: identity
};
