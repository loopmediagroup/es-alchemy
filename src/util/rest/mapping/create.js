const historic = require('./historic');

module.exports = async (call, idx, mapping) => {
  // eslint-disable-next-line no-underscore-dangle
  const r = await call('PUT', `${idx}@${mapping.mappings[idx]._meta.hash}`, { body: mapping });

  // delete old, empty versions
  const oldVersionsEmpty = Object
    .entries(await historic(call, idx, mapping))
    .filter(([_, docCount]) => docCount === 0).map(([name, _]) => name);
  if (oldVersionsEmpty.length !== 0) {
    await Promise.all(oldVersionsEmpty.map((i) => call('DELETE', i)));
  }

  return r.statusCode === 200 && r.body.acknowledged === true;
};
