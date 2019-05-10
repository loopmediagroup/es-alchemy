const path = require('path');
const uuid4 = require('uuid/v4');
const expect = require('chai').expect;
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const Index = require('../src/index');
const { toCursor } = require('../src/util/paging');

chai.use(deepEqualInAnyOrder);

const models = Index.loadJsonInDir(path.join(__dirname, 'models'));
const indices = Index.loadJsonInDir(path.join(__dirname, 'indices'));
const mappings = Index.loadJsonInDir(path.join(__dirname, 'mappings'));
const fields = Index.loadJsonInDir(path.join(__dirname, 'fields'));
const rels = Index.loadJsonInDir(path.join(__dirname, 'rels'));
const remaps = Index.loadJsonInDir(path.join(__dirname, 'remaps'));
const query = Index.loadJsonInDir(path.join(__dirname, 'query'));
const queryMappings = Index.loadJsonInDir(path.join(__dirname, 'query', 'mappings'));

describe('Testing index', () => {
  let index;

  const registerEntitiesForIndex = () => {
    Object.entries(models).forEach(([name, specs]) => {
      index.model.register(name, specs);
    });
    Object.entries(indices).forEach(([name, specs]) => {
      index.index.register(name, specs);
    });
  };

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing responseHook.', async () => {
    // setup
    index = Index({
      endpoint: process.env.elasticsearchEndpoint,
      responseHook: ({ request, response }) => {
        expect(Object.keys(request)).to.deep.equal(['headers', 'method', 'endpoint', 'index', 'body']);
        expect(Object.keys(response)).to.include.members(['statusCode', 'body', 'headers', 'timings']);
        expect(response.statusCode).to.equal(200);
      }
    });
    registerEntitiesForIndex();

    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', { upsert: [{ id: offerId }] })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    const filter = index.query.build('offer', {
      toReturn: ['id'],
      filterBy: { and: [['id', '==', offerId]] },
      limit: 1,
      offset: 0
    });
    await index.rest.data.query('offer', filter, { resolveWithFullResponse: true });
    // cleanup
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing models', () => {
    Object.entries(indices).forEach(([k, v]) => {
      expect(index.index.getModel(k)).to.equal(v.model);
    });
  });

  it('Testing specs', () => {
    Object.entries(indices).forEach(([k, v]) => {
      expect(index.index.getSpecs(k)).to.deep.equal(Object.assign({ name: k }, v));
    });
  });

  it('Testing mappings', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(mappings).sort());
    Object.entries(mappings).forEach(([k, v]) => {
      expect(index.index.getMapping(k)).to.deep.equal(v);
    });
  });

  it('Testing fields', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(fields).sort());
    Object.entries(fields).forEach(([k, v]) => {
      expect(index.index.getFields(k)).to.deep.equal(v);
    });
  });

  it('Testing rels', () => {
    expect(index.index.list()).to.deep.equal(Object.keys(rels).sort());
    Object.entries(rels).forEach(([k, v]) => {
      expect(index.index.getRels(k)).to.deep.equal(v);
    });
  });

  it('Testing remap', () => {
    Object.entries(remaps).forEach(([k, v]) => {
      const remapped = index.data.remap(v.index, v.input);
      expect(remapped, `Debug: ${JSON.stringify(remapped)}`).to.deep.equal(v.result);
    });
  });

  describe('Testing Query Creation', () => {
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
  });

  describe('Testing Query Filter', () => {
    it('Testing property type "object" fully returned', async () => {
      const offerId = uuid4();
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [index.data.remap('offer', {
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        })]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter = index.query.build('offer', {
        toReturn: ['id', 'meta'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      });
      const queryResult = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult, filter)).to.deep.equal({
        payload: [{
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        }],
        page: {
          next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
          previous: null,
          index: {
            max: 1,
            current: 1
          },
          size: 1
        }
      });
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });

    it('Testing property type "geo_shape" returned as list', async () => {
      const offerId = uuid4();
      const coordinates = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
      expect(await index.rest.mapping.create('offer'), 'create').to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [{
          id: offerId,
          locations: [
            { address: { area: { type: 'Polygon', coordinates: [coordinates] } } },
            { address: { area: null } }
          ]
        }]
      }), 'Insert').to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter = index.query.build('offer', {
        toReturn: ['id', 'locations.address.area'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      });
      const queryResult = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult, filter)).to.deep.equal({
        payload: [{
          id: offerId,
          locations: [
            { address: { area: coordinates } },
            { address: { area: null } }
          ]
        }],
        page: {
          next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
          previous: null,
          index: {
            max: 1,
            current: 1
          },
          size: 1
        }
      });
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });

    it('Testing empty relationship returned as empty list.', async () => {
      const offerId = uuid4();
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [{
          id: offerId,
          locations: []
        }]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter = index.query.build('offer', {
        toReturn: ['id', 'locations.name'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      });
      const queryResult = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult, filter)).to.deep.equal({
        payload: [{
          id: offerId,
          locations: []
        }],
        page: {
          next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
          previous: null,
          index: {
            max: 1,
            current: 1
          },
          size: 1
        }
      });
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });
  });

  describe('Testing nested filtering', () => {
    it('Testing allow separate relationships', async () => {
      const offerId = uuid4();
      expect(await index.rest.mapping.recreate('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [{
          id: offerId,
          locations: [{
            id: uuid4(),
            address: { id: uuid4(), street: 'value1', city: 'value1' }
          }, {
            id: uuid4(),
            address: { id: uuid4(), street: 'value2', city: 'value2' }
          }]
        }]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter1 = index.query.build('offer', {
        filterBy: {
          target: 'union',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      });
      const queryResult1 = await index.rest.data.query('offer', filter1);
      expect((index.data.page(queryResult1, filter1)).payload.length).to.equal(1);
      const filter2 = index.query.build('offer', {
        filterBy: {
          target: 'separate',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      });
      const queryResult2 = await index.rest.data.query('offer', filter2);
      expect((index.data.page(queryResult2, filter2)).payload.length).to.equal(0);
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    }).timeout(10000);

    it('Testing nested filtered in sort', async () => {
      const offerIds = [uuid4(), uuid4(), uuid4(), uuid4()];
      expect(await index.rest.mapping.recreate('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [{
          id: offerIds[0],
          headline: 'First',
          locations: [
            { id: uuid4(), name: '1', address: { id: uuid4(), street: 'A' } },
            { id: uuid4(), name: '1', address: { id: uuid4(), street: 'B' } }
          ]
        }, {
          id: offerIds[2],
          headline: 'Second',
          locations: [
            { id: uuid4(), name: '1', address: { id: uuid4(), street: 'A' } },
            { id: uuid4(), name: '2', address: { id: uuid4(), street: 'B' } }
          ]
        }, {
          id: offerIds[1],
          headline: 'Third',
          locations: [
            { id: uuid4(), name: '2', address: { id: uuid4(), street: 'A' } },
            { id: uuid4(), name: '1', address: { id: uuid4(), street: 'B' } }
          ]
        }, {
          id: offerIds[3],
          headline: 'Fourth',
          locations: [
            { id: uuid4(), name: '2', address: { id: uuid4(), street: 'A' } },
            { id: uuid4(), name: '2', address: { id: uuid4(), street: 'B' } }
          ]
        }].sort(() => Math.random() - 0.5)
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter = index.query.build('offer', {
        orderBy: [
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'A']] }],
          ['locations.name', 'asc', 'max', { and: [['locations.address.street', '==', 'B']] }]
        ],
        toReturn: ['headline']
      });
      const queryResult = await index.rest.data.query('offer', filter);
      expect(queryResult.hits.hits).to.deep.equal([
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offerIds[0],
          _score: null,
          _source: { headline: 'First' },
          sort: ['1', '1', offerIds[0]]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offerIds[2],
          _score: null,
          _source: { headline: 'Second' },
          sort: ['1', '2', offerIds[2]]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offerIds[1],
          _score: null,
          _source: { headline: 'Third' },
          sort: ['2', '1', offerIds[1]]
        },
        {
          _index: 'offer@229a59500f278ce9d4cd24ce6afc4e191845a937',
          _type: 'offer',
          _id: offerIds[3],
          _score: null,
          _source: { headline: 'Fourth' },
          sort: ['2', '2', offerIds[3]]
        }
      ]);
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    }).timeout(10000);
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

  describe('Testing REST interaction', () => {
    const validate = async (count, historic) => {
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.count('offer')).to.equal(count);
      expect(await index.rest.mapping.historic('offer')).to.deep.equal(historic);
    };
    const checkDocs = async (uuids) => {
      const filter = index.query.build('offer', {
        toReturn: ['id'],
        filterBy: { and: [['id', 'in', uuids]] },
        limit: 1,
        offset: 1
      });
      const queryResult = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult, filter)).to.deep.equal({
        payload: [{ id: uuids[1] }],
        page: {
          next: { limit: 1, offset: 2, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoyfQ==' },
          previous: { limit: 1, offset: 0, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowfQ==' },
          index: {
            max: 3,
            current: 2
          },
          size: 1
        }
      });
    };

    it('Testing Versioning (populated)', async () => {
      // eslint-disable-next-line no-underscore-dangle
      const mappingHash = index.index.getMapping('offer').mappings.offer._meta.hash;
      const uuids = [uuid4(), uuid4(), uuid4()].sort();
      await index.rest.mapping.delete('offer');
      // create new index
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      await validate(0, {});
      expect(await index.rest.data.historic('offer')).to.deep.equal([]);
      // insert data
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, {});
      expect(await index.rest.data.historic('offer')).to.deep.equal([]);
      // create new version of index
      index.index.register('offer', Object.assign({}, indices.offer, { fields: ['id'] }));
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      await validate(3, { [`offer@${mappingHash}`]: 3 });
      await checkDocs(uuids);
      expect((await index.rest.data.historic('offer')).sort()).to.deep.equal(uuids);
      expect((await index.rest.data.historic('offer', 1)).length).to.deep.equal(1);
      // update data
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, { [`offer@${mappingHash}`]: 0 });
      await checkDocs(uuids);
      expect(await index.rest.data.historic('offer')).to.deep.equal([]);
      // update data again
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, {});
      await checkDocs(uuids);
      expect(await index.rest.data.historic('offer')).to.deep.equal([]);
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });

    it('Testing Versioning (empty)', async () => {
      // create new index
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.mapping.historic('offer')).to.deep.equal({});
      // create new version of index
      index.index.register('offer', Object.assign({}, indices.offer, { fields: ['id'] }));
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.mapping.historic('offer')).to.deep.equal({});
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });

    it('Testing lifecycle', async () => {
      // eslint-disable-next-line no-underscore-dangle
      const mappingHash = index.index.getMapping('offer').mappings.offer._meta.hash;
      const uuids = [uuid4(), uuid4(), uuid4()].sort();
      await index.rest.mapping.delete('offer');
      expect(await index.rest.mapping.list()).to.deep.equal([]);
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.mapping.create('offer')).to.equal(false);
      expect(await index.rest.mapping.recreate('offer')).to.equal(true);
      expect(await index.rest.mapping.list()).to.deep.equal(['offer']);
      expect((await index.rest.mapping.get('offer')).body[`offer@${mappingHash}`])
        .to.deep.equal(index.index.getMapping('offer'));
      const filter1 = index.query.build();
      const queryResult1 = await index.rest.data.query('offer', filter1);
      expect(index.data.page(queryResult1, filter1)).to.deep.equal({
        payload: [],
        page: {
          next: null,
          previous: null,
          index: {
            current: 1,
            max: 1
          },
          size: 20
        }
      });
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.count('offer')).to.equal(3);
      const filter2 = index.query.build('offer', {
        toReturn: ['id'],
        filterBy: { and: [['id', 'in', uuids]] },
        limit: 1,
        offset: 1
      });
      const queryResult2 = await index.rest.data.query('offer', filter2);
      expect(index.data.page(queryResult2, filter2)).to.deep.equal({
        payload: [{ id: uuids[1] }],
        page: {
          next: { limit: 1, offset: 2, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoyfQ==' },
          previous: { limit: 1, offset: 0, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowfQ==' },
          index: {
            max: 3,
            current: 2
          },
          size: 1
        }
      });
      expect(await index.rest.data.update('offer', { remove: uuids })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.count('offer')).to.equal(0);
      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    }).timeout(10000);

    it('Testing delete not found', async () => {
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });

    it('Testing count not found', async () => {
      expect(await index.rest.data.count('offer')).to.equal(false);
    });

    it('Testing create no action', async () => {
      expect(await index.rest.data.update('offer', {})).to.equal(true);
    });

    it('Testing call without options', async () => {
      expect((await index.rest.call('GET', uuid4())).statusCode).to.equal(404);
    });

    it('Query with Batch Examples', async () => {
      // setup custom mappings
      await Promise.all(Object.entries(queryMappings).map(([idx, meta]) => index.rest
        .call('DELETE', `${idx}@*`).then(() => index.rest
          .call('PUT', `${idx}@version-hash`, { body: meta }))));
      expect((await index.rest.mapping.list()).sort())
        .to.deep.equal(['offer', 'region', 'venue'].sort());
      // run tests
      await Object.entries(queryMappings)
        .map(([idx, v]) => index.rest.data.query(
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
              successful: 5,
              total: 5
            },
            timed_out: false
          });
        }))
        .reduce((p, c) => p.then(() => c), Promise.resolve());
      // cleanup mappings
      await Promise.all(Object.keys(queryMappings).map(idx => index.rest.mapping.delete(idx)));
    }).timeout(10000);

    it('Testing mapping indexExists', async () => {
      expect(await index.rest.mapping.exists('offer')).to.equal(false);
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.mapping.exists('offer')).to.equal(true);
      // clean up
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });
  });

  describe('Testing data formats', () => {
    it('Testing "object" data type updating', async () => {
      const offerId = uuid4();
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [index.data.remap('offer', {
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        })]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const filter = index.query.build('offer', {
        toReturn: ['id', 'meta'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      });
      const queryResult1 = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult1, filter)).to.deep.equal({
        payload: [{
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        }],
        page: {
          next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
          previous: null,
          index: {
            max: 1,
            current: 1
          },
          size: 1
        }
      });
      expect(await index.rest.data.update('offer', {
        upsert: [index.data.remap('offer', {
          id: offerId,
          meta: {
            k4: []
          }
        })]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      const queryResult2 = await index.rest.data.query('offer', filter);
      expect(index.data.page(queryResult2, filter)).to.deep.equal({
        payload: [{
          id: offerId,
          meta: {
            k4: []
          }
        }],
        page: {
          next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
          previous: null,
          index: {
            max: 1,
            current: 1
          },
          size: 1
        }
      });

      // cleanup
      expect(await index.rest.mapping.delete('offer')).to.equal(true);
    });
  });

  it('Testing twice nested empty relationship returned as empty list.', async () => {
    const offerId = uuid4();
    const locationId = uuid4();
    expect(await index.rest.mapping.recreate('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', {
      upsert: [{
        id: offerId,
        locations: [
          {
            id: locationId,
            tags: []
          }
        ]
      }]
    })).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    const filter = index.query.build('offer', {
      toReturn: ['id', 'locations.tags.name'],
      filterBy: { and: [['id', '==', offerId]] },
      limit: 1,
      offset: 0
    });
    const queryResult = await index.rest.data.query('offer', filter);
    expect(index.data.page(queryResult, filter)).to.deep.equal({
      payload: [{
        id: offerId,
        locations: [{ tags: [] }]
      }],
      page: {
        next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
        previous: null,
        index: {
          max: 1,
          current: 1
        },
        size: 1
      }
    });
    // cleanup
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
