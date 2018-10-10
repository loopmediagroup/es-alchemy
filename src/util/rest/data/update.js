module.exports = (call, idx, mapping, { remove = [], upsert = [] }) => {
  const payload = [];
  upsert.forEach((doc) => {
    payload.push(JSON.stringify({ update: { _type: idx, _id: doc.id } }));
    payload.push(JSON.stringify({ doc, doc_as_upsert: true }));
  });
  remove.forEach((docId) => {
    payload.push(JSON.stringify({ delete: { _type: idx, _id: docId } }));
  });

  if (payload.length === 0) {
    return true;
  }
  // eslint-disable-next-line no-underscore-dangle
  return call("POST", `${idx}@${mapping.mappings[idx]._meta.hash}`, {
    endpoint: "_bulk",
    body: payload.concat("").join("\n"),
    headers: { 'content-type': 'application/x-ndjson' },
    json: false
  }).then(r => r.statusCode === 200 && !JSON.parse(r.body).errors);
};
