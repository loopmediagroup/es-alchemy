export default ({ call, idx, mapping }) => call(
  'HEAD',
  // eslint-disable-next-line no-underscore-dangle
  `${idx}@${mapping.mappings._meta.hash}`,
  { body: null }
)
  .then((r) => r.statusCode === 200);
