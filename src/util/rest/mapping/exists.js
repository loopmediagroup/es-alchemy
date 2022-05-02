export default (call, index, mapping) => call(
  'HEAD',
  // eslint-disable-next-line no-underscore-dangle
  `${index}@${mapping.mappings._meta.hash}`,
  { body: null }
)
  .then((r) => r.statusCode === 200);
