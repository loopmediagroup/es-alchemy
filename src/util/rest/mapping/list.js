export default ({ call }) => call('GET', '_cat', { endpoint: 'indices' })
  .then((r) => [...new Set(r.body.map((idx) => idx.index.split('@')[0]))]);
