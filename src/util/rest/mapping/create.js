export default async ({ call, idx, mapping }) => {
  // eslint-disable-next-line no-underscore-dangle
  const r = await call('PUT', `${idx}@${mapping.mappings._meta.hash}`, { body: mapping });

  return r.statusCode === 200 && r.body.acknowledged === true;
};
