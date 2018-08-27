module.exports = (call, idx) => call('DELETE', idx)
  .then(r => (r.statusCode === 200 && r.body.acknowledged === true) || r.statusCode === 404);
