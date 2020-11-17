module.exports = (call, idx, mapping) => call(
  'GET',
  // eslint-disable-next-line no-underscore-dangle
  `${idx}@${mapping.mappings._meta.hash}`,
  { endpoint: '_mapping' }
);
