module.exports = (call, index, mapping) => call(
  'HEAD',
  // eslint-disable-next-line no-underscore-dangle
  `${index}@${mapping.mappings[index]._meta.hash}`,
  { body: null }
)
  .then((r) => r.statusCode === 200);
