const { expect } = require('chai');
const uuid4 = require('uuid/v4');
const Index = require('../../src/index');
const { toCursor } = require('../../src/util/paging');
const { registerEntitiesForIndex, query } = require('../util');

describe('Testing Query Creation', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing query.build', () => {
    Object.entries(query).forEach(([k, v]) => {
      const result = index.query.build(null, {
        toReturn: v.toReturn || [''],
        filterBy: v.filterBy || [],
        orderBy: v.orderBy || [],
        scoreBy: v.scoreBy || [],
        limit: v.limit,
        offset: v.offset
      });
      expect(result, `Debug: ${JSON.stringify(result)}`).to.deep.equalInAnyOrder(v.result);
    });
  });

  it('Testing query.build with defaults', () => {
    expect(index.query.build()).to.deep.equal({
      _source: [''],
      size: 20,
      from: 0,
      sort: [{ id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with cursor.', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 })
    })).to.deep.equal({
      _source: [''],
      size: 10,
      from: 10,
      sort: [{ id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with cursor limit override.', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 }),
      limit: 15
    })).to.deep.equal({
      _source: [''],
      size: 15,
      from: 10,
      sort: [{ id: { order: 'asc' } }]
    });
  });

  describe('Testing orderBy', () => {
    it('Testing "mode" for asc, desc', async () => {
      expect(await index.rest.mapping.recreate('offer')).to.equal(true);
      await Promise.all([
        {
          orderBy: [['id', 'desc', 'max']],
          result: { sort: [{ id: { mode: 'max', order: 'desc' } }] }
        },
        {
          orderBy: [['id', 'desc', 'min']],
          result: { sort: [{ id: { mode: 'min', order: 'desc' } }] }
        },
        {
          orderBy: [['id', 'asc', 'max']],
          result: { sort: [{ id: { mode: 'max', order: 'asc' } }] }
        },
        {
          orderBy: [['id', 'asc', 'min']],
          result: { sort: [{ id: { mode: 'min', order: 'asc' } }] }
        }
      ].map(async ({ orderBy, result }) => {
        expect(await index.query.build('offer', { toReturn: ['id'], orderBy })).to.deep.contain(result);
      }));
    });
  });

  describe('Testing sorting by score', () => {
    it('Testing existence in array sorting', async () => {
      const offer1 = {
        id: uuid4(),
        flags: ['one', 'two']
      };
      const offer2 = {
        id: uuid4(),
        flags: ['one', 'three']
      };
      expect(await index.rest.mapping.recreate('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', { upsert: [offer1, offer2] })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      await Promise.all([
        {
          scoreBy: [['==', 'flags', 'three']],
          result: [offer2, offer1]
        },
        {
          scoreBy: [['==', 'flags', 'one'], ['==', 'flags', 'two']],
          result: [offer1, offer2]
        },
        {
          scoreBy: [['==', 'flags', 'two', 3], ['==', 'flags', 'three', 1]],
          result: [offer1, offer2]
        }
      ].map(async ({ scoreBy, result }) => {
        const filter = await index.query.build('offer', {
          toReturn: ['id', 'flags'],
          scoreBy
        });
        const queryResult = await index.rest.data.query('offer', filter);
        expect(index.data.page(queryResult, filter).payload, `${scoreBy}`).to.deep.equal(result);
      }));
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    }).timeout(10000);
  });

  it('Testing Multi Version Query', async () => {
    const indexName = 'version-index-test';
    const meta = { mappings: { idx: { properties: { uuid: { type: 'keyword' } } } } };

    // initialization
    await index.rest.call('DELETE', `${indexName}@*`);
    const create1 = await index.rest.call('PUT', `${indexName}@1`, { body: meta });
    expect(create1.statusCode).to.equal(200);
    const create2 = await index.rest.call('PUT', `${indexName}@2`, { body: meta });
    expect(create2.statusCode).to.equal(200);

    // add data
    const uuid = uuid4();
    await index.rest.call('PUT', `${indexName}@2/idx/${uuid}`, { body: { uuid } });
    await index.rest.call('PUT', `${indexName}@1/idx/${uuid}`, { body: { uuid } });
    await index.rest.call('POST', `${indexName}@*`, { endpoint: '_refresh' });

    // run query
    const result = await index.rest.call('GET', `${indexName}@*`, { endpoint: '_search' });
    expect(result.body.hits.total).to.equal(2);

    // cleanup
    const delResult = await index.rest.call('DELETE', `${indexName}@*`);
    expect(delResult.statusCode).to.equal(200);
  });
});
