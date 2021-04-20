const identity = (v) => v;

const mkFn = (
  def,
  meta = {
    marshall: identity,
    unmarshall: identity
  }
) => {
  const r = (...args) => args.reduce((prev, arg) => ({ ...prev, ...arg }), def);
  r.meta = meta;
  return r;
};

module.exports = {
  date: mkFn({ type: 'date', format: 'yyyy-MM-dd' }),
  boolean: mkFn({ type: 'boolean' }),
  integer: mkFn({ type: 'long' }),
  uuid: mkFn({ type: 'keyword' }),
  id: mkFn({ type: 'keyword' }),
  keyword: mkFn({ type: 'keyword' }),
  point: mkFn(
    { type: 'geo_point' },
    {
      marshall: (v) => (v ? [v[0], v[1]] : null),
      unmarshall: identity
    }
  ),
  shape: mkFn(
    { type: 'geo_shape' },
    {
      marshall: (v) => (v ? { type: 'Polygon', coordinates: [v] } : null),
      unmarshall: (v) => (v !== null ? v.coordinates[0] : null)
    }
  ),
  polygon: mkFn(
    { type: 'geo_shape' },
    {
      marshall: (v) => (v ? { type: 'Polygon', coordinates: v } : null),
      unmarshall: (v) => (v !== null ? v.coordinates : null)
    }
  ),
  polygons: mkFn(
    { type: 'geo_shape' },
    {
      marshall: (vs) => (vs ? vs.map((v) => ({ type: 'Polygon', coordinates: v })) : null),
      unmarshall: (vs) => (vs !== null ? vs.map(({ coordinates }) => coordinates) : null)
    }
  ),
  datetime: mkFn({ type: 'date', format: "yyyy-MM-dd'T'HH:mm:ss.SSSX" }),
  string: mkFn({ type: 'text' }),
  enum: mkFn({ type: 'keyword' }),
  object: mkFn(
    { type: 'object', enabled: false },
    {
      marshall: (v) => [v],
      unmarshall: (v) => v[0]
    }
  )
};
