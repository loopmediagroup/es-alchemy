import fs from 'smart-fs';
import path from 'path';

// load all json files in directory
// returns `{ [FILENAME_WITHOUT_EXT]: FILE_CONTENT }`
export default (folder) => fs
  .readdirSync(folder)
  .filter((f) => f.endsWith('.json'))
  .reduce((obj, f) => Object.assign(obj, {
    [f.slice(0, -5)]: fs.smartRead(path.join(folder, f))
  }), {});
