module.exports = (call) => call(
  'GET',
  '_nodes',
  { endpoint: 'stats' }
);
