export default async ({ call, idx, mapping }) => {
  // eslint-disable-next-line no-underscore-dangle
  const version = `${idx}@${mapping.mappings._meta.hash}`;
  const r = await call('GET', '', { endpoint: `${version}/_alias/${idx}` });
  return r.statusCode === 200 && Object.keys(r.body[version].aliases[idx]).length === 0;
};
