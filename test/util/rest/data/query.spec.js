const assert = require('assert');
const { expect } = require('chai');
const uuid4 = require('uuid/v4');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../util');

describe('Testing Rest Query', () => {
  let index;

  beforeEach(async () => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    assert(await index.rest.mapping.create('offer') === true);
  });

  afterEach(async () => {
    assert(await index.rest.mapping.delete('offer') === true);
  });

  const upsertOffers = async (offers) => {
    expect(await index.rest.data.update('offer', {
      upsert: offers.map(o => index.data.remap('offer', o))
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
  };

  const queryOffers = async (filterParams, { raw = false } = {}) => {
    const filter = index.query.build('offer', filterParams);
    const queryResult = await index.rest.data.query('offer', filter);
    return raw === true ? queryResult : index.data.page(queryResult, filter).payload;
  };

  describe('Testing Query Filter', () => {
    it('Testing property type "object" fully returned', async () => {
      const offer = {
        id: uuid4(),
        meta: { k1: 'v1', k2: ['v2'], k3: [] }
      };
      await upsertOffers([offer]);
      expect(await queryOffers({
        toReturn: ['id', 'meta'],
        filterBy: { and: [['id', '==', offer.id]] }
      })).to.deep.equal([offer]);
    });

    it('Testing property type "geo_shape" returned as list', async () => {
      const offer = {
        id: uuid4(),
        locations: [
          { address: { area: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]] } },
          { address: { area: null } }
        ]
      };
      await upsertOffers([offer]);
      expect(await queryOffers({
        toReturn: ['id', 'locations.address.area'],
        filterBy: { and: [['id', '==', offer.id]] }
      })).to.deep.equal([offer]);
    });

    it('Testing empty relationship returned as empty list.', async () => {
      const offer = { id: uuid4(), locations: [] };
      await upsertOffers([offer]);
      expect(await queryOffers({
        toReturn: ['id', 'locations.name'],
        filterBy: { and: [['id', '==', offer.id]] }
      })).to.deep.equal([offer]);
    });
  });

  describe('Testing nested filtering', () => {
    it('Testing allow separate relationships', async () => {
      const offerId = uuid4();
      await upsertOffers([{
        id: offerId,
        locations: [{
          id: uuid4(),
          address: { id: uuid4(), street: 'value1', city: 'value1' }
        }, {
          id: uuid4(),
          address: { id: uuid4(), street: 'value2', city: 'value2' }
        }]
      }]);
      expect((await queryOffers({
        filterBy: {
          target: 'union',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      })).length).to.equal(1);
      expect((await queryOffers({
        filterBy: {
          target: 'separate',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      })).length).to.equal(0);
    }).timeout(10000);

    it('Testing nested filtered in sort', async () => {
      const offer1 = {
        id: uuid4(),
        headline: 'First',
        locations: [
          { id: uuid4(), name: '1', address: { id: uuid4(), street: 'A' } },
          { id: uuid4(), name: '1', address: { id: uuid4(), street: 'B' } }
        ]
      };
      const offer2 = {
        id: uuid4(),
        headline: 'Second',
        locations: [
          { id: uuid4(), name: '1', address: { id: uuid4(), street: 'A' } },
          { id: uuid4(), name: '2', address: { id: uuid4(), street: 'B' } }
        ]
      };
      const offer3 = {
        id: uuid4(),
        headline: 'Third',
        locations: [
          { id: uuid4(), name: '2', address: { id: uuid4(), street: 'A' } },
          { id: uuid4(), name: '1', address: { id: uuid4(), street: 'B' } }
        ]
      };
      const offer4 = {
        id: uuid4(),
        headline: 'Fourth',
        locations: [
          { id: uuid4(), name: '2', address: { id: uuid4(), street: 'A' } },
          { id: uuid4(), name: '2', address: { id: uuid4(), street: 'B' } }
        ]
      };
      await upsertOffers([offer1, offer2, offer3, offer4].sort(() => Math.random() - 0.5));
      expect((await queryOffers({
        orderBy: [
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'A']] }],
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'B']] }]
        ],
        toReturn: ['headline']
      }, { raw: true })).hits.hits).to.deep.equal([
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offer1.id,
          _score: null,
          _source: { headline: 'First' },
          sort: ['1', '1', offer1.id]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offer2.id,
          _score: null,
          _source: { headline: 'Second' },
          sort: ['1', '2', offer2.id]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offer3.id,
          _score: null,
          _source: { headline: 'Third' },
          sort: ['2', '1', offer3.id]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offer4.id,
          _score: null,
          _source: { headline: 'Fourth' },
          sort: ['2', '2', offer4.id]
        }
      ]);
    }).timeout(10000);
  });

  it('Testing twice nested empty relationship returned as empty list.', async () => {
    const offer = {
      id: uuid4(),
      locations: [{ id: uuid4(), tags: [] }]
    };
    await upsertOffers([offer]);
    expect(await queryOffers({
      toReturn: ['id', 'locations.id', 'locations.tags.name'],
      filterBy: { and: [['id', '==', offer.id]] }
    })).to.deep.equal([offer]);
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
      const offer1 = { id: uuid4(), flags: ['one', 'two'] };
      const offer2 = { id: uuid4(), flags: ['one', 'three'] };
      await upsertOffers([offer1, offer2]);
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
        expect(await queryOffers({ toReturn: ['id', 'flags'], scoreBy })).to.deep.equal(result);
      }));
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
