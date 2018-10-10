// eslint-disable-next-line no-underscore-dangle
module.exports = (call, idx, mapping) => call('PUT', `${idx}@${mapping.mappings[idx]._meta.hash}`, { body: mapping })
  .then(r => r.statusCode === 200 && r.body.acknowledged === true);
