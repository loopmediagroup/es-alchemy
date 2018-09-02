module.exports = call => call("GET", "_cat", { endpoint: "indices" })
  .then(r => r.body.map(idx => idx.index));
