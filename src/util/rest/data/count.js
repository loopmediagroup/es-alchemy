const call = require("../call");

module.exports = idx => call("POST", idx, { endpoint: "_count" })
  .then(r => (r.statusCode === 200 ? r.body.count : false));
