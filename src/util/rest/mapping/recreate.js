const del = require("./delete");
const create = require("./create");

module.exports = (idx, mapping) => del(idx).then(r => r && create(idx, mapping));
