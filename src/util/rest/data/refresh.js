module.exports = (call, idx) => call("POST", idx, { endpoint: "_refresh" })
  // eslint-disable-next-line no-underscore-dangle
  .then(r => r.statusCode === 200 && r.body._shards.failed === 0);
