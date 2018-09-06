const identity = v => v;

module.exports = {
  date: identity,
  boolean: identity,
  integer: identity,
  uuid: identity,
  point: v => (v ? {
    lon: v[0],
    lat: v[1]
  } : null),
  shape: v => (v ? {
    type: "Polygon",
    coordinates: [v]
  } : null),
  datetime: identity,
  string: identity,
  enum: identity
};
