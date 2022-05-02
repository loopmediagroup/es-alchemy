export default (call) => call(
  'GET',
  '_nodes',
  { endpoint: 'stats' }
).then(({ body }) => body);
