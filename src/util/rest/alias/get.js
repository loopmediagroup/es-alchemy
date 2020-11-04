module.exports = async (call, idx) => call('GET', '', {
  endpoint: `_cat/aliases/${idx}`
})
  .then((result) => (result.body.length === 0 ? null : result.body.map(({ index }) => index)));
