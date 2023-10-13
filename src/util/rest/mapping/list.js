export default ({ call }) => call('GET', '_cat', { endpoint: 'indices' })
  .then((r) => {
    const indices = r.body
      .filter(({ index }) => index[0] !== '.')
      .map(({ index }) => index.split('@')[0]);
    return [...new Set(indices)];
  });
