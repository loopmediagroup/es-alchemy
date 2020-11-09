const assert = require('assert');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const sfs = require('smart-fs');

const indexVersions = {};

module.exports.persist = (indices, folder) => {
  let result = false;
  Object.entries(indices).forEach(([idx, def]) => {
    const key = `${idx}@${get(def, 'mapping.mappings._meta.hash')}.json`;
    const filePath = path.join(folder, key);
    if (!sfs.existsSync(filePath)) {
      sfs.smartWrite(filePath, {
        timestamp: Math.floor(new Date().getTime() / 1000),
        ...def
      });
      result = true;
    }
  });
  return result;
};

module.exports.load = (folder) => {
  assert(Object.keys(indexVersions).length === 0, 'Cannot call load multiple times');
  const files = sfs.walkDir(folder)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));
  files.forEach((file) => {
    const def = sfs.smartRead(path.join(folder, `${file}.json`));
    const defPath = file.split('@');
    set(indexVersions, defPath, def);
  });
};

module.exports.get = () => indexVersions;
