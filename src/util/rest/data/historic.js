module.exports = (call, limit, listIndices) => {
  const indices = Object
    .entries(listIndices())
    // eslint-disable-next-line no-underscore-dangle
    .reduce((prev, [name, mapping]) => prev.concat(`-${name}@${mapping.mappings[name]._meta.hash}`), ['*'])
    .join(',');
  return call('POST', indices, {
    endpoint: '_search?ignore_unavailable=true',
    body: {
      query: {
        function_score: { functions: [{ random_score: {} }] }
      },
      size: limit
    }
  })
    // eslint-disable-next-line no-underscore-dangle
    .then(r => r.body.hits.hits.reduce((p, e) => Object.assign(p, { [e._id]: e._type }), {}));
};
