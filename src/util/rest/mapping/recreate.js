const del = require("./delete");
const create = require("./create");

module.exports = (call, idx, mapping) => del(call, idx).then(r => r && create(call, idx, mapping));
