const path = require('path');
const uuid4 = require('uuid/v4');
const expect = require('chai').expect;
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const Index = require('../src/index');

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
  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    Object.entries(models).forEach(([name, specs]) => {
      index.model.register(name, specs);
    });
    Object.entries(indices).forEach(([name, specs]) => {
      index.index.register(name, specs);
    });
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
        sort: [{ id: { mode: 'max', order: 'asc' } }]
      });
    });
  });

  describe('Testing Query Filter', () => {
    it('Testing property type "object" fully returned', async () => {
      const offerId = uuid4();
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.data.update('offer', {
        upsert: [{
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        }]
      })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.query('offer', index.query.build('offer', {
        toReturn: ['id', 'meta'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      }))).to.deep.equal({
        payload: [{
          id: offerId,
          meta: {
            k1: 'v1',
            k2: ['v2'],
            k3: []
          }
        }],
        page: {
          next: { limit: 1, offset: 1 },
          previous: null,
          max: 1,
          current: 1,
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
      expect(await index.rest.data.query('offer', index.query.build('offer', {
        toReturn: ['id', 'locations.address.area'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      }))).to.deep.equal({
        payload: [{
          id: offerId,
          locations: [
            { address: { area: coordinates } },
            { address: { area: null } }
          ]
        }],
        page: {
          next: { limit: 1, offset: 1 },
          previous: null,
          max: 1,
          current: 1,
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
      expect(await index.rest.data.query('offer', index.query.build('offer', {
        toReturn: ['id', 'locations.name'],
        filterBy: { and: [['id', '==', offerId]] },
        limit: 1,
        offset: 0
      }))).to.deep.equal({
        payload: [{
          id: offerId,
          locations: []
        }],
        page: {
          next: { limit: 1, offset: 1 },
          previous: null,
          max: 1,
          current: 1,
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
      expect((await index.rest.data.query('offer', index.query.build('offer', {
        filterBy: {
          target: 'union',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      }))).payload.length).to.equal(1);
      expect((await index.rest.data.query('offer', index.query.build('offer', {
        filterBy: {
          target: 'separate',
          and: ['locations.address.street == value1', 'locations.address.city == value2']
        }
      }))).payload.length).to.equal(0);
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
      expect(await index.rest.data.query('offer', index.query.build('offer', {
        toReturn: ['id'],
        filterBy: { and: [['id', 'in', uuids]] },
        limit: 1,
        offset: 1
      }))).to.deep.equal({
        payload: [{ id: uuids[1] }],
        page: {
          next: { limit: 1, offset: 2 },
          previous: { limit: 1, offset: 0 },
          max: 3,
          current: 2,
          size: 1
        }
      });
    };

    it('Testing versioning', async () => {
      // eslint-disable-next-line no-underscore-dangle
      const mappingHash = index.index.getMapping('offer').mappings.offer._meta.hash;
      const uuids = [uuid4(), uuid4(), uuid4()].sort();
      await index.rest.mapping.delete('offer');
      // create new index
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      await validate(0, {});
      expect(await index.rest.data.historic()).to.deep.equal({});
      // insert data
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, {});
      expect(await index.rest.data.historic()).to.deep.equal({});
      // create new version of index
      index.index.register('offer', Object.assign({}, indices.offer, { fields: ['id'] }));
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      await validate(3, { [`offer@${mappingHash}`]: 3 });
      await checkDocs(uuids);
      expect(await index.rest.data.historic())
        .to.deep.equal(uuids.reduce((p, c) => Object.assign(p, { [c]: 'offer' }), {}));
      expect(Object.keys(await index.rest.data.historic(1)).length).to.deep.equal(1);
      // update data
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, { [`offer@${mappingHash}`]: 0 });
      await checkDocs(uuids);
      expect(await index.rest.data.historic()).to.deep.equal({});
      // update data again
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      await validate(3, {});
      await checkDocs(uuids);
      expect(await index.rest.data.historic()).to.deep.equal({});
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
      expect(await index.rest.data.query('offer', index.query.build())).to.deep.equal({
        payload: [],
        page: {
          next: null,
          previous: null,
          current: 1,
          max: 1,
          size: 20
        }
      });
      expect(await index.rest.data.update('offer', { upsert: uuids.map(id => ({ id })) })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.count('offer')).to.equal(3);
      expect(await index.rest.data.query('offer', index.query.build('offer', {
        toReturn: ['id'],
        filterBy: { and: [['id', 'in', uuids]] },
        limit: 1,
        offset: 1
      }))).to.deep.equal({
        payload: [{ id: uuids[1] }],
        page: {
          next: { limit: 1, offset: 2 },
          previous: { limit: 1, offset: 0 },
          max: 3,
          current: 2,
          size: 1
        }
      });
      expect(await index.rest.data.update('offer', { remove: uuids })).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await index.rest.data.count('offer')).to.equal(0);
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
          }),
          { raw: true }
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
  });
});
