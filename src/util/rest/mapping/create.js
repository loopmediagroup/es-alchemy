const call = require("../call");

module.exports = (idx, mapping) => call('PUT', idx, { body: mapping })
  .then(r => r.statusCode === 200 && r.body.acknowledged === true);
