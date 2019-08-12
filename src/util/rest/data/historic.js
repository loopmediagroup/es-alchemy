module.exports = (call, index, mapping, limit) => call(
  'POST',
  // eslint-disable-next-line no-underscore-dangle
  `${index}@*,-${index}@${mapping.mappings[index]._meta.hash}`,
  {
    endpoint: '_search?ignore_unavailable=true',
    body: { size: limit, stored_fields: [] }
  }
)
  // eslint-disable-next-line no-underscore-dangle
  .then((r) => r.body.hits.hits.reduce((p, e) => p.concat(e._id), []));
