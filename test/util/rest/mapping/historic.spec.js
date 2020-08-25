const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { indices, queryMappings, registerEntitiesForIndex } = require('../../../helper');
const { objectEncode } = require('../../../../src/util/paging');

describe('Testing REST interaction', { timeout: 10000 }, () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

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
        next: { limit: 1, offset: 2, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoyLCJzZWFyY2hBZnRlciI6W119' },
        previous: { limit: 1, offset: 0, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowLCJzZWFyY2hBZnRlciI6W119' },
        scroll: {
          cursor: objectEncode({ limit: 1, offset: 1, searchAfter: [uuids[1]] }),
          limit: 1,
          offset: 1,
          searchAfter: [
            uuids[1]
          ]
        },
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
    const mappingHash = index.index.getMapping('offer').mappings._meta.hash;
    const uuids = [uuid4(), uuid4(), uuid4()].sort();
    await index.rest.mapping.delete('offer');
    // create new index
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    await validate(0, {});
    expect(await index.rest.data.historic('offer')).to.deep.equal([]);
    // insert data
    expect(await index.rest.data.update('offer', uuids.map((id) => ({
      action: 'update',
      doc: {
        id
      }
    })))).to.equal(true);
    await validate(3, {});
    expect(await index.rest.data.historic('offer')).to.deep.equal([]);
    // create new version of index
    index.index.register('offer', { ...indices.offer, fields: ['id'] });
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    await validate(3, { [`offer@${mappingHash}`]: 3 });
    await checkDocs(uuids);
    expect((await index.rest.data.historic('offer')).sort()).to.deep.equal(uuids);
    expect((await index.rest.data.historic('offer', 1)).length).to.deep.equal(1);
    // update data
    expect(await index.rest.data.update('offer', uuids.map((id) => ({
      action: 'update',
      doc: {
        id
      }
    })))).to.equal(true);
    await validate(3, { [`offer@${mappingHash}`]: 0 });
    await checkDocs(uuids);
    expect(await index.rest.data.historic('offer')).to.deep.equal([]);
    // update data again
    expect(await index.rest.data.update('offer', uuids.map((id) => ({
      action: 'update',
      doc: {
        id
      }
    })))).to.equal(true);
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
    index.index.register('offer', { ...indices.offer, fields: ['id'] });
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.mapping.historic('offer')).to.deep.equal({});
    // cleanup
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing lifecycle', async () => {
    // eslint-disable-next-line no-underscore-dangle
    const mappingHash = index.index.getMapping('offer').mappings._meta.hash;
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
        scroll: null,
        index: {
          current: 1,
          max: 1
        },
        size: 20
      }
    });
    expect(await index.rest.data.update('offer', uuids.map((id) => ({
      action: 'update',
      doc: {
        id
      }
    })))).to.equal(true);
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
        next: { limit: 1, offset: 2, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoyLCJzZWFyY2hBZnRlciI6W119' },
        previous: { limit: 1, offset: 0, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowLCJzZWFyY2hBZnRlciI6W119' },
        scroll: {
          cursor: objectEncode({ limit: 1, offset: 1, searchAfter: [uuids[1]] }),
          limit: 1,
          offset: 1,
          searchAfter: [
            uuids[1]
          ]
        },
        index: {
          max: 3,
          current: 2
        },
        size: 1
      }
    });
    expect(await index.rest.data.update('offer', uuids.map((id) => ({
      action: 'delete',
      id
    })))).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(0);
    // cleanup
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing delete not found', async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing count not found', async () => {
    expect(await index.rest.data.count('offer')).to.equal(false);
  });

  it('Testing create no action', async () => {
    expect(await index.rest.data.update('offer', [])).to.equal(true);
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

  it('Testing mapping indexExists', async () => {
    expect(await index.rest.mapping.exists('offer')).to.equal(false);
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.mapping.exists('offer')).to.equal(true);
    // clean up
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
