import assert from 'assert';
import get from 'lodash.get';

export default ({ call, idx, id }) => call('GET', `${idx}@*`, {
  endpoint: '_count',
  body: { query: { match: { _id: id } } }
})
  .then((r) => {
    const count = get(r, 'body.count');
    assert(Number.isInteger(count));
    return count > 0;
  });
