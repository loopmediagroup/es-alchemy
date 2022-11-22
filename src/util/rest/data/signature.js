import assert from 'assert';
import get from 'lodash.get';

export default ({ call, idx, id }) => call('GET', idx, { endpoint: `_doc/${id}?_source=false` })
  .then((r) => {
    const isFound = get(r, 'body.found', null);
    assert([null, true, false].includes(isFound));
    if (isFound === null) {
      throw new Error(get(r, 'body.error.type'));
    }
    const docSignature = isFound === true
      ? [get(r, 'body._seq_no'), get(r, 'body._primary_term')]
      : ['null'];
    return [...(docSignature), get(r, 'body._index')].join('_');
  });
