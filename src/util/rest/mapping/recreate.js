import del from './delete.js';
import create from './create.js';

export default ({ call, idx, mapping }) => del({ call, idx })
  .then((r) => r && create({ call, idx, mapping }));
