import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../src/index.js';
import { queryMappings } from '../helper.js';

describe('Testing batch files', { timeout: 10000 }, () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
  });

  it('Query with Batch Examples', async () => {
    const mappings = Object.entries(queryMappings);
    for (let i = 0; i < mappings.length; i += 1) {
      const [idx, meta] = mappings[i];
      // eslint-disable-next-line no-await-in-loop
      await index.rest.call('PUT', `${idx}@version-hash`, { body: meta });
      // eslint-disable-next-line no-await-in-loop
      await index.rest.call('POST', '', {
        endpoint: '_aliases',
        body: { actions: [{ add: { index: `${idx}@version-hash`, alias: idx } }] }
      });
    }
    expect((await index.rest.mapping.list()).sort())
      .to.deep.equal(['offer', 'region', 'venue'].sort());
    // run tests
    await mappings.map(([idx, v]) => index.rest.data.query(
      idx,
      index.query.build(null, {
        toReturn: v.toReturn,
        filterBy: v.filterBy || [],
        orderBy: v.orderBy || [],
        scoreBy: v.scoreBy || [],
        limit: v.limit,
        offset: v.offset
      })
    ).then((r) => {
      expect(r).to.deep.contain({
        _shards: {
          failed: 0,
          skipped: 0,
          successful: 1,
          total: 1
        },
        timed_out: false
      });
    }))
      .reduce((p, c) => p.then(() => c), Promise.resolve());
    // cleanup mappings
    await Promise.all(Object.keys(queryMappings).map((idx) => index.rest.mapping.delete(idx)));
  });
});
