export const getIndexVersions = async (call, idx) => {
  const result = await call('GET', '', {
    endpoint: `_cat/indices/${idx}@*`
  });
  return result.body.map(({ index }) => index.split('@')[1]);
};

export const createIndexVersion = (call, idx, mapping) => call(
  'PUT',
  // eslint-disable-next-line no-underscore-dangle
  `${idx}@${mapping.mappings._meta.hash}`,
  { body: mapping }
).then((r) => r.statusCode === 200 && r.body.acknowledged === true);

export const deleteIndexVersion = (call, idx, version) => call('DELETE', `${idx}@${version}`)
  .then((r) => r.statusCode === 200 && r.body.acknowledged === true);
