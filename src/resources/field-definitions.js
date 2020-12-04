const mkFn = (result) => (...args) => args
  .reduce((prev, arg) => ({ ...prev, ...arg }), result);

module.exports = {
  date: mkFn({
    type: 'date',
    format: 'yyyy-MM-dd'
  }),
  boolean: mkFn({
    type: 'boolean'
  }),
  integer: mkFn({
    type: 'long'
  }),
  uuid: mkFn({
    type: 'keyword'
  }),
  id: mkFn({
    type: 'keyword'
  }),
  keyword: mkFn({
    type: 'keyword'
  }),
  point: mkFn({
    type: 'geo_point'
  }),
  shape: mkFn({
    type: 'geo_shape'
  }),
  datetime: mkFn({
    type: 'date',
    format: "yyyy-MM-dd'T'HH:mm:ss.SSSX"
  }),
  string: mkFn({
    type: 'text'
  }),
  enum: mkFn({
    type: 'keyword'
  }),
  object: mkFn({
    type: 'object',
    enabled: false
  })
};
