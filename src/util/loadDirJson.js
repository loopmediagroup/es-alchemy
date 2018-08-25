const fs = require("fs");
const path = require("path");

// load all json files in directory
// returns `{ [FILENAME_WITHOUT_EXT]: FILE_CONTENT }`
module.exports = (folder) => fs
  .readdirSync(folder)
  .filter(f => f.endsWith(".json"))
  .map(f => f.slice(0, -5))
  .reduce((obj, f) => Object.assign(obj, {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    [f]: require(path.join(folder, f))
  }), {});
