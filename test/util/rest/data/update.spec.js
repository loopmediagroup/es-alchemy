const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const get = require('lodash.get');
const Joi = require('joi-strict');
const sfs = require('smart-fs');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');
const { objectEncode } = require('../../../../src/util/paging');

describe('Testing data formats', { useTmpDir: true }, () => {
  let index;
  let instantiateIndex;
  let createIndexVersion;
  let updatedOfferModel;
  let updatedOfferIndex;
  let queryVersions;
  let setupTwoIndices;
  let offerId;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
      registerEntitiesForIndex(index);
    };
    createIndexVersion = async (dir) => {
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.alias.update('offer')).to.equal(true);
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
    };
    const [offerModelPath, offerIndexPath] = ['models', 'indices']
      .map((v) => path.join(__dirname, '..', '..', '..', `${v}`, 'offer.json'));
    updatedOfferModel = sfs.smartRead(offerModelPath);
    updatedOfferIndex = sfs.smartRead(offerIndexPath);
    updatedOfferModel.fields.subhead = 'string';
    updatedOfferIndex.fields.push('subhead');
    queryVersions = async (idx, fields = ['id', 'meta', 'subhead']) => {
      const r = await index.rest.call('GET', `${idx}@*`, {
        endpoint: '_search',
        body: {
          _source: fields
        }
      });
      return r.body.hits.hits.map(({ _index: version, _source: data }) => ({ version, data }));
    };
    setupTwoIndices = async (dir) => {
      instantiateIndex();
      index.model.register('offer', updatedOfferModel);
      index.index.register('offer', updatedOfferIndex);
      await createIndexVersion(dir);
      expect(await index.rest.data.update([{
        idx: 'offer',
        action: 'update',
        doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
      }])).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
      expect(await queryVersions('offer')).to.deep.equal([
        { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { meta: [{ k1: 'v1' }], id: offerId } },
        { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
      ]);
    };
  });

  beforeEach(async ({ dir }) => {
    instantiateIndex();
    await createIndexVersion(dir);
    offerId = uuid4();
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing delete fails when signature and entity not exists', async () => {
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'delete',
      id: offerId,
      signature: '0_1_offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    }]);
    const schema = Joi.array().ordered(
      Joi.object().keys({
        delete: Joi.object().keys({
          _index: Joi.string(),
          _type: Joi.string().valid('_doc'),
          _id: Joi.string(),
          status: Joi.number().valid(409),
          error: Joi.object().keys({
            type: Joi.string().valid('version_conflict_engine_exception'),
            reason: Joi.string(),
            index_uuid: Joi.string(),
            shard: Joi.string(),
            index: Joi.string()
          })
        })
      })
    );
    expect(Joi.test(r, schema)).to.equal(true);
  });

  it('Testing update fails when signature null and entity exists', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      signature: 'null_offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    }])).to.equal(true);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      signature: 'null_offer@6a1b8f491e156e356ab57e8df046b9f449acb440'
    }]);
    const schema = Joi.array().ordered(
      Joi.object().keys({
        create: Joi.object().keys({
          _index: Joi.string(),
          _type: Joi.string().valid('_doc'),
          _id: Joi.string(),
          status: Joi.number().valid(409),
          error: Joi.object().keys({
            type: Joi.string().valid('version_conflict_engine_exception'),
            reason: Joi.string(),
            index_uuid: Joi.string(),
            shard: Joi.string(),
            index: Joi.string()
          })
        })
      })
    );
    expect(Joi.test(r, schema)).to.equal(true);
  });

  it('Testing update with signature', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
    }])).to.equal(true);
    const signature = await index.rest.data.signature('offer', offerId);
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      signature
    }])).to.equal(true);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v3' } }),
      signature
    }]);
    const schema = Joi.array().ordered(
      Joi.object().keys({
        update: Joi.object().keys({
          _index: Joi.string(),
          _type: Joi.string().valid('_doc'),
          _id: Joi.string(),
          status: Joi.number().valid(409),
          error: Joi.object().keys({
            type: Joi.string().valid('version_conflict_engine_exception'),
            reason: Joi.string(),
            index_uuid: Joi.string(),
            shard: Joi.string(),
            index: Joi.string()
          })
        })
      })
    );
    expect(Joi.test(r, schema)).to.equal(true);
  });

  it('Testing "object" data type updating', async () => {
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: {
          k1: 'v1',
          k2: ['v2'],
          k3: []
        }
      })
    }])).to.equal(true);
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
        next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxLCJzZWFyY2hBZnRlciI6W119' },
        previous: null,
        scroll: {
          cursor: objectEncode({ limit: 1, offset: 0, searchAfter: [offerId] }),
          limit: 1,
          offset: 0,
          searchAfter: [
            offerId
          ]
        },
        index: {
          max: 1,
          current: 1
        },
        size: 1
      }
    });
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        meta: {
          k4: []
        }
      })
    }])).to.equal(true);
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
        next: {
          limit: 1,
          offset: 1,
          cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxLCJzZWFyY2hBZnRlciI6W119'
        },
        scroll: {
          cursor: objectEncode({ limit: 1, offset: 0, searchAfter: [offerId] }),
          limit: 1,
          offset: 0,
          searchAfter: [
            offerId
          ]
        },
        previous: null,
        index: {
          max: 1,
          current: 1
        },
        size: 1
      }
    });
  });

  it('Testing update with signature match', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      signature: '0_1_offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0'
    }]);
    expect(r).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { meta: [{ k1: 'v2' }], id: offerId } },
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v2' }], id: offerId } }
    ]);
  });

  it('Testing update with signature mismatch', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      signature: '1_1_offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0'
    }]);
    expect(r.map(({ update }) => get(update, 'error.type')))
      .to.deep.equal(['version_conflict_engine_exception', undefined]);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { meta: [{ k1: 'v2' }], id: offerId } },
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
    ]);
  });

  it('Testing update with signature version mismatch', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      signature: '0_1_offer@0123456789012345678901234567890123456789'
    }]);
    expect(r.map(({ update }) => get(update, 'error.type')))
      .to.deep.equal(['version_conflict_engine_exception', undefined]);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { meta: [{ k1: 'v2' }], id: offerId } },
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
    ]);
  });

  it('Testing delete with signature match', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'delete',
      doc: index.data.remap('offer', { id: offerId }),
      signature: '0_1_offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0'
    }]);
    expect(r).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([]);
  });

  it('Testing delete with signature mismatch', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'delete',
      doc: index.data.remap('offer', { id: offerId }),
      signature: '1_1_offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0'
    }]);
    expect(r.map(({ delete: del }) => get(del, 'error.type')))
      .to.deep.equal(['version_conflict_engine_exception', undefined]);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
    ]);
  });

  it('Testing delete with signature version mismatch', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'delete',
      doc: index.data.remap('offer', { id: offerId }),
      signature: '0_1_offer@0123456789012345678901234567890123456789'
    }]);
    expect(r.map(({ delete: del }) => get(del, 'error.type')))
      .to.deep.equal(['version_conflict_engine_exception', undefined]);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
    ]);
  });

  it('Testing delete with signature null', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'delete',
      doc: index.data.remap('offer', { id: offerId }),
      signature: 'null_offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0'
    }]);
    expect(r).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { meta: [{ k1: 'v1' }], id: offerId } }
    ]);
  });

  it('Testing update with field pruning', async ({ dir }) => {
    await setupTwoIndices(dir);
    const signature = await index.rest.data.signature('offer', offerId);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, subhead: 'entry' }),
      signature
    }]);
    expect(r).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer')).to.deep.equal([{
      version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440',
      data: { meta: [{ k1: 'v1' }], id: offerId }
    }, {
      version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0',
      data: { meta: [{ k1: 'v1' }], subhead: 'entry', id: offerId }
    }]);
  });

  it('Testing update where empty relationship gets nulled', async ({ dir }) => {
    await setupTwoIndices(dir);
    const r1 = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, locations: [{ id: 'loc1' }] })
    }]);
    expect(r1).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer', ['id', 'locations.id'])).to.deep.equal([
      { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { id: offerId, locations: [{ id: 'loc1' }] } },
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { id: offerId, locations: [{ id: 'loc1' }] } }
    ]);
    const r2 = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, locations: [] })
    }]);
    expect(r2).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await queryVersions('offer', ['id', 'locations.id'])).to.deep.equal([
      { version: 'offer@6a1b8f491e156e356ab57e8df046b9f449acb440', data: { id: offerId } },
      { version: 'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', data: { id: offerId } }
    ]);
  });

  it('Testing empty update', async () => {
    expect(await index.rest.data.update([])).to.equal(true);
  });
});
