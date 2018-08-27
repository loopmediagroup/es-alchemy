const call = require("../call");

module.exports = idx => call("GET", idx, { endpoint: "_mapping" });
