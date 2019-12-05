const set = require('lodash.set');
const objectScan = require('object-scan');
const historic = require('../mapping/historic');

module.exports = async (call, idx, rels, mapping, { remove = [], upsert = [] }) => {
  const oldVersionsEntries = Object.entries(await historic(call, idx, mapping));
  const oldVersionsEmpty = oldVersionsEntries.filter(([_, docCount]) => docCount === 0).map(([name, _]) => name);
  const oldVersionsNonEmpty = oldVersionsEntries.filter(([_, docCount]) => docCount !== 0).map(([name, _]) => name);

  if (oldVersionsEmpty.length !== 0) {
    // delete old, empty versions
    await Promise.all(oldVersionsEmpty.map((i) => call('DELETE', i)));
  }

  // eslint-disable-next-line no-underscore-dangle
  const index = `${idx}@${mapping.mappings[idx]._meta.hash}`;
  const payload = [];

  // delete elements from old index versions
  [...upsert.map((doc) => doc.id), ...remove]
    .forEach((docId) => oldVersionsNonEmpty
      .forEach((i) => payload.push(JSON.stringify({ delete: { _index: i, _type: idx, _id: docId } }))));

  // todo: can reduce traversal, but need good tests first / possibly need to adjust object-scan
  const emptyToNull = (() => {
    const relsToCheck = Object.entries(rels)
      .filter(([_, v]) => v.endsWith('[]'))
      .map(([k]) => k);
    return (input) => {
      objectScan(relsToCheck, {
        useArraySelector: false,
        joined: false,
        breakFn: (k, v, { isMatch }) => {
          if (isMatch && Array.isArray(v) && v.length === 0) {
            set(input, k, null);
          }
        }
      })(input);
    };
  })();

  upsert.forEach((doc) => {
    emptyToNull(doc);
    // `update` performs no action when exact document already indexed (reduced load)
    payload.push(JSON.stringify({ update: { _index: index, _type: idx, _id: doc.id } }));
    payload.push(JSON.stringify({ doc, doc_as_upsert: true }));
  });
  remove.forEach((docId) => {
    payload.push(JSON.stringify({ delete: { _index: index, _type: idx, _id: docId } }));
  });

  if (payload.length === 0) {
    return true;
  }
  return call('POST', '', {
    endpoint: '_bulk',
    body: payload.concat('').join('\n'),
    headers: { 'content-type': 'application/x-ndjson' },
    json: false
  }).then((r) => r.statusCode === 200 && !JSON.parse(r.body).errors);
};
