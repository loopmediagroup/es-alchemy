const assert = require('assert');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing Rest Query', { timeout: 10000 }, () => {
  let index;

  beforeEach(async () => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    assert(await index.rest.mapping.create('offer') === true, 'Offer index exists');
    assert(await index.rest.mapping.create('address') === true, 'Address index exists');
  });

  afterEach(async () => {
    assert(await index.rest.mapping.delete('address') === true, 'Address index delete failed');
    assert(await index.rest.mapping.delete('offer') === true, 'Offer index delete failed');
  });

  const upsert = async (model, models) => {
    expect(await index.rest.data.update(model, models.map((o) => ({
      action: 'update',
      doc: index.data.remap(model, o)
    }))), `${model} update failed`).to.equal(true);
    expect(await index.rest.data.refresh(model), `${model} refresh failed`).to.equal(true);
  };

  const query = async (model, filterParams, { raw = false } = {}) => {
    const filter = index.query.build(model, filterParams);
    const queryResult = await index.rest.data.query(model, filter);
    return raw === true ? queryResult : index.data.page(queryResult, filter).payload;
  };

  describe('Testing Query Filter', () => {
    it('Testing property type "object" fully returned', async () => {
      const offer = {
        id: uuid4(),
        meta: { k1: 'v1', k2: ['v2'], k3: [] }
      };
      await upsert('offer', [offer]);
      expect(await query('offer', {
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
      await upsert('offer', [offer]);
      expect(await query('offer', {
        toReturn: ['id', 'locations.address.area'],
        filterBy: { and: [['id', '==', offer.id]] }
      })).to.deep.equal([offer]);
    });

    it('Testing empty relationship returned as empty list.', async () => {
      const offer = { id: uuid4(), locations: [] };
      await upsert('offer', [offer]);
      expect(await query('offer', {
        toReturn: ['id', 'locations.name'],
        filterBy: { and: [['id', '==', offer.id]] }
      })).to.deep.equal([offer]);
    });
  });

  describe('Testing nested filtering', () => {
    it('Testing allow separate relationships', async () => {
      const offerId = uuid4();
      await upsert('offer', [{
        id: offerId,
        locations: [{
          id: uuid4(),
          address: { id: uuid4(), street: 'value1', city: 'value1' }
        }, {
          id: uuid4(),
          address: { id: uuid4(), street: 'value2', city: 'value2' }
        }]
      }]);
      expect((await query('offer', {
        filterBy: {
          target: 'union',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      })).length).to.equal(1);
      expect((await query('offer', {
        filterBy: {
          target: 'separate',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      })).length).to.equal(0);
    });

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
      await upsert('offer', [offer1, offer2, offer3, offer4].sort(() => Math.random() - 0.5));
      expect((await query('offer', {
        orderBy: [
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'A']] }],
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'B']] }]
        ],
        toReturn: ['headline']
      }, { raw: true })).hits.hits).to.deep.equal([
        {
          _index: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440',
          _type: '_doc',
          _id: offer1.id,
          _score: null,
          _source: { headline: 'First' },
          sort: ['1', '1', offer1.id]
        },
        {
          _index: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440',
          _type: '_doc',
          _id: offer2.id,
          _score: null,
          _source: { headline: 'Second' },
          sort: ['1', '2', offer2.id]
        },
        {
          _index: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440',
          _type: '_doc',
          _id: offer3.id,
          _score: null,
          _source: { headline: 'Third' },
          sort: ['2', '1', offer3.id]
        },
        {
          _index: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440',
          _type: '_doc',
          _id: offer4.id,
          _score: null,
          _source: { headline: 'Fourth' },
          sort: ['2', '2', offer4.id]
        }
      ]);
    });
  });

  it('Testing twice nested empty relationship returned as empty list.', async () => {
    const offer = {
      id: uuid4(),
      locations: [{ id: uuid4(), tags: [] }]
    };
    await upsert('offer', [offer]);
    expect(await query('offer', {
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
    describe('Testing scoring by existence in array', () => {
      it('Testing existence in array top level', async () => {
        const offer1 = { id: uuid4(), flags: ['one', 'two'] };
        const offer2 = { id: uuid4(), flags: ['one', 'three'] };
        await upsert('offer', [offer1, offer2]);
        await Promise.all([
          {
            scoreBy: [['==', 'flags', 'three', [[0, 0], [1, 0], [1, 1]]]],
            result: [offer2, offer1]
          },
          {
            scoreBy: [
              ['==', 'flags', 'one', [[0, 0], [1, 0], [1, 1]]],
              ['==', 'flags', 'two', [[0, 0], [1, 0], [1, 1]]]
            ],
            result: [offer1, offer2]
          },
          {
            scoreBy: [
              ['==', 'flags', 'two', [[0, 0], [1, 0], [1, 3]]],
              ['==', 'flags', 'three', [[0, 0], [1, 0], [1, 1]]]
            ],
            result: [offer1, offer2]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('offer', { toReturn: ['id', 'flags'], scoreBy }), `${scoreBy}`).to.deep.equal(result);
        }));
      });

      it('Testing existence in array nested', async () => {
        const offer1 = {
          id: uuid4(),
          locations: [{
            id: uuid4(),
            address: { keywords: ['one', 'two'] }
          }]
        };
        const offer2 = {
          id: uuid4(),
          locations: [{
            id: uuid4(),
            address: { keywords: ['one', 'three'] }
          }]
        };
        await upsert('offer', [offer1, offer2]);
        await Promise.all([
          {
            scoreBy: [['==', 'locations.address.keywords', 'three', [[0, 0], [1, 0], [1, 1]]]],
            result: [offer2, offer1]
          },
          {
            scoreBy: [
              ['==', 'locations.address.keywords', 'one', [[0, 0], [1, 0], [1, 1]]],
              ['==', 'locations.address.keywords', 'two', [[0, 0], [1, 0], [1, 1]]]
            ],
            result: [offer1, offer2]
          },
          {
            scoreBy: [
              ['==', 'locations.address.keywords', 'two', [[0, 0], [1, 0], [1, 3]]],
              ['==', 'locations.address.keywords', 'three', [[0, 0], [1, 0], [1, 1]]]
            ],
            result: [offer1, offer2]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('offer', {
            toReturn: ['id', 'locations.id', 'locations.address.keywords'],
            scoreBy
          }), `${scoreBy}`).to.deep.equal(result);
        }));
      });
    });

    describe('Testing scoring by distance', () => {
      it('Testing distance top level', async () => {
        const address1 = {
          id: uuid4(),
          centre: [0, 0]
        };
        const address2 = {
          id: uuid4(),
          centre: [1, 1]
        };
        await upsert('address', [address1, address2]);
        await Promise.all([
          {
            scoreBy: [['distance', 'centre', [0, 0], [[0, 1], [1, 1], [1, 0]]]],
            result: [address1, address2]
          },
          {
            scoreBy: [['distance', 'centre', [1, 1], [[0, 1], [1, 1], [1, 0]]]],
            result: [address2, address1]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('address', {
            toReturn: ['id', 'centre'],
            scoreBy
          }), `${scoreBy}`).to.deep.equal(result);
        }));
      });

      it('Testing distance nested', async () => {
        const offer1 = {
          id: uuid4(),
          locations: [{
            id: uuid4(),
            address: {
              centre: [0, 0]
            }
          }]
        };
        const offer2 = {
          id: uuid4(),
          locations: [{
            id: uuid4(),
            address: {
              centre: [1, 1]
            }
          }]
        };
        await upsert('offer', [offer1, offer2]);
        await Promise.all([
          {
            scoreBy: [['distance', 'locations.address.centre', [0, 0], [[0, 1], [1, 1], [1, 0]]]],
            result: [offer1, offer2]
          },
          {
            scoreBy: [['distance', 'locations.address.centre', [1, 1], [[0, 1], [1, 1], [1, 0]]]],
            result: [offer2, offer1]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('offer', {
            toReturn: ['id', 'locations.id', 'locations.address.centre'],
            scoreBy
          }), `${scoreBy}`).to.deep.equal(result);
        }));
      });
    });

    describe('Testing scoring by age', () => {
      it('Testing age top level', async () => {
        const address1 = {
          id: uuid4(),
          created: '2019-01-01T00:00:00.000Z'
        };
        const address2 = {
          id: uuid4(),
          created: '2019-02-01T00:00:00.000Z'
        };
        await upsert('address', [address1, address2]);
        await Promise.all([
          {
            scoreBy: [['age', 'created', '2019-02-01T00:00:00.000Z', [[0, 0], [1, 0], [1, 1]]]],
            result: [address1, address2]
          },
          {
            scoreBy: [['age', 'created', '2019-02-01T00:00:00.000Z', [[0, 1], [1, 0], [1, 0]]]],
            result: [address2, address1]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('address', {
            toReturn: ['id', 'created'],
            scoreBy
          }), `${scoreBy}`).to.deep.equal(result);
        }));
      });

      it('Testing age nested', async () => {
        const offer1 = {
          id: uuid4(),
          locations: [
            { address: { created: '2019-01-01T00:00:00.000Z' } }
          ]
        };
        const offer2 = {
          id: uuid4(),
          locations: [
            { address: { created: '2019-02-01T00:00:00.000Z' } }
          ]
        };
        await upsert('offer', [offer1, offer2]);
        await Promise.all([
          {
            scoreBy: [['age', 'locations.address.created', '2019-02-01T00:00:00.000Z', [[0, 0], [1, 0], [1, 1]]]],
            result: [offer1, offer2]
          },
          {
            scoreBy: [['age', 'locations.address.created', '2019-02-01T00:00:00.000Z', [[0, 1], [1, 1], [1, 0]]]],
            result: [offer2, offer1]
          }
        ].map(async ({ scoreBy, result }) => {
          expect(await query('offer', {
            toReturn: ['id', 'locations.address.created'],
            scoreBy
          }), `${scoreBy}`).to.deep.equal(result);
        }));
      });
    });

    describe('Testing filters with scoring', () => {
      let offer1;
      let offer2;
      let offer3;
      before(() => {
        offer1 = {
          id: uuid4(),
          locations: [
            { address: { created: '2019-01-02T00:00:00.000Z', centre: [0, 0] } },
            { address: { created: '2019-01-03T00:00:00.000Z', centre: [1, 1] } }
          ]
        };
        offer2 = {
          id: uuid4(),
          locations: [
            { address: { created: '2019-01-02T00:00:00.000Z', centre: [1, 1] } },
            { address: { created: '2019-01-03T00:00:00.000Z', centre: [0, 0] } }
          ]
        };
        offer3 = {
          id: uuid4(),
          locations: [
            { address: { created: '2019-01-01T00:00:00.000Z', centre: [1, 1] } },
            { address: { created: '2019-01-01T00:00:00.000Z', centre: [1, 1] } }
          ]
        };
      });

      beforeEach(async () => {
        await upsert('offer', [offer1, offer2, offer3]);
      });

      it('Testing scoreBy with filter', async () => {
        expect((await query('offer', {
          toReturn: ['id', 'locations.address.created', 'locations.address.centre'],
          scoreBy: [
            ['age', 'locations.address.created', '2019-01-03T00:00:00.000Z', [
              [0, 2], [86399, 2], [86399, 1], [100000, 1], [100000, 0]
            ], {
              and: [['locations.address.centre', 'distance', [0, 0], '1km']]
            }]
          ]
        }, { raw: true })).hits.hits.map((o) => o.sort)).to.deep.equal([
          [2, offer2.id],
          [1, offer1.id],
          [0, offer3.id]
        ]);
      });

      it('Testing filterBy with scoreBy', async () => {
        expect((await query('offer', {
          filterBy: {
            and: [['locations.address.centre', 'distance', [0, 0], '1km']]
          },
          toReturn: ['id', 'locations.address.created', 'locations.address.centre'],
          scoreBy: [
            ['age', 'locations.address.created', '2019-01-03T00:00:00.000Z', [
              [0, 2], [86399, 2], [86399, 1], [100000, 1], [100000, 0]
            ], {
              and: [['locations.address.centre', 'distance', [0, 0], '1km']]
            }]
          ]
        }, { raw: true })).hits.hits.map((o) => o.sort)).to.deep.equal([
          [2, offer2.id],
          [1, offer1.id]
        ]);
      });
    });

    describe('Testing multiple scoreBy', () => {
      let location1;
      let location2;
      let location3;
      let offer1;
      let offer2;
      let offer3;
      let offer4;
      let offer5;
      let offer6;
      let offer7;
      let offer8;
      let offer9;
      before(() => {
        location1 = { id: uuid4(), address: { centre: [0, 0] } };
        location2 = { id: uuid4(), address: { centre: [0.001, 0.001] } };
        location3 = { id: uuid4(), address: { centre: [0.002, 0.002] } };
        offer1 = { id: uuid4(), locations: [location1, location2], flags: [] };
        offer2 = { id: uuid4(), locations: [location1, location2], flags: ['exclusive'] };
        offer3 = { id: uuid4(), locations: [location1, location2], flags: ['featured'] };
        offer4 = { id: uuid4(), locations: [location2, location3], flags: [] };
        offer5 = { id: uuid4(), locations: [location2, location3], flags: ['exclusive'] };
        offer6 = { id: uuid4(), locations: [location2, location3], flags: ['featured'] };
        offer7 = { id: uuid4(), locations: [location3], flags: [] };
        offer8 = { id: uuid4(), locations: [location3], flags: ['exclusive'] };
        offer9 = { id: uuid4(), locations: [location3], flags: ['featured'] };
      });

      it('Testing multiple scoring', async () => {
        await upsert('offer', [offer1, offer2, offer3, offer4, offer5, offer6, offer7, offer8, offer9]);
        expect((await query('offer', {
          toReturn: ['id', 'flags', 'locations.id', 'locations.address.centre'],
          scoreBy: [
            ['distance', 'locations.address.centre', [0, 0], [
              [0, 7], [157, 7], [157, 3], [314, 3], [314, 2]
            ]],
            ['==', 'flags', 'exclusive', [[0, 0], [1, 0], [1, 3]]],
            ['==', 'flags', 'featured', [[0, 0], [1, 0], [1, 11]]]
          ]
        }, { raw: true })).hits.hits.map((o) => o.sort)).to.deep.equal([
          [18, offer3.id],
          [14, offer6.id],
          [13, offer9.id],
          [10, offer2.id],
          [7, offer1.id],
          [6, offer5.id],
          [5, offer8.id],
          [3, offer4.id],
          [2, offer7.id]
        ]);
      });

      it('Testing multiple scoring with filter', async () => {
        await upsert('offer', [offer1, offer2, offer3, offer5, offer6]);
        expect((await query('offer', {
          toReturn: ['id', 'flags', 'locations.id', 'locations.address.centre'],
          scoreBy: [
            ['distance', 'locations.address.centre', [0, 0], [[0, 3], [157, 3], [157, 2]]],
            ['==', 'flags', 'exclusive', [[0, 0], [1, 0], [1, 2]], {
              and: [['locations.address.centre', 'distance', [0, 0], '160m']]
            }],
            ['==', 'flags', 'featured', [[0, 0], [1, 0], [1, 5]], {
              and: [['locations.address.centre', 'distance', [0, 0], '5m']]
            }]
          ]
        }, { raw: true })).hits.hits.map((o) => o.sort)).to.deep.equal([
          [8, offer3.id],
          [5, offer2.id],
          [4, offer5.id],
          [3, offer1.id],
          [2, offer6.id]
        ]);
      });
    });

    describe('Testing mapping functionality', () => {
      let address1;
      let address2;
      let address3;
      let address4;
      before(() => {
        address1 = {
          id: uuid4(),
          centre: [0, 0]
        };
        address2 = {
          id: uuid4(),
          centre: [0.001, 0.001]
        };
        address3 = {
          id: uuid4(),
          centre: [0.01, 0.01]
        };
        address4 = {
          id: uuid4(),
          centre: [0.1, 0.1]
        };
      });

      it('Testing mapping function as step function', async () => {
        await upsert('address', [address1, address2, address3]);
        expect((await query('address', {
          toReturn: ['id', 'centre'],
          scoreBy: [['distance', 'centre', [0, 0], [[0, 2], [150, 2], [150, 1], [1000, 1], [1000, 0]]]]
        }, { raw: true })).hits.hits.map((a) => a.sort)).to.deep.equal([
          [2, address1.id],
          [1, address2.id],
          [0, address3.id]
        ]);
      });

      it('Testing mapping function as linear function', async () => {
        await upsert('address', [address1, address2, address3, address4]);
        expect((await query('address', {
          toReturn: ['id', 'centre'],
          scoreBy: [['distance', 'centre', [0, 0], [[5, 5], [1000, 1], [2000, 0]]]]
        }, { raw: true })).hits.hits.map((a) => a.sort)).to.deep.equal([
          [5, address1.id],
          [4.38795, address2.id],
          [0.42746934, address3.id],
          [0, address4.id]
        ]);
      });
    });
  });

  it('Testing Multi Version Query', async () => {
    const indexName = 'version-index-test';
    const meta = { mappings: { properties: { uuid: { type: 'keyword' } } } };

    // initialization
    await index.rest.call('DELETE', `${indexName}@*`);
    const create1 = await index.rest.call('PUT', `${indexName}@1`, { body: meta });
    expect(create1.statusCode).to.equal(200);
    const create2 = await index.rest.call('PUT', `${indexName}@2`, { body: meta });
    expect(create2.statusCode).to.equal(200);

    // add data
    const uuid = uuid4();
    await index.rest.call('PUT', `${indexName}@2/_doc/${uuid}`, { body: { uuid } });
    await index.rest.call('PUT', `${indexName}@1/_doc/${uuid}`, { body: { uuid } });
    await index.rest.call('POST', `${indexName}@*`, { endpoint: '_refresh' });

    // run query
    const result = await index.rest.call('GET', `${indexName}@*`, { endpoint: '_search' });
    expect(result.body.hits.total.value).to.equal(2);

    // cleanup
    const delResult = await index.rest.call('DELETE', `${indexName}@*`);
    expect(delResult.statusCode).to.equal(200);
  });
});
