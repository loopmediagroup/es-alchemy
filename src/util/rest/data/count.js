module.exports = (call, idx) => call("POST", `${idx}@*`, { endpoint: "_count" })
  // eslint-disable-next-line no-underscore-dangle
  .then(r => (r.statusCode === 200 && r.body._shards.total !== 0 ? r.body.count : false));
