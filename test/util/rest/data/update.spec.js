const path = require('path');
const { expect } = require('chai');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const sfs = require('smart-fs');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');
const { objectEncode } = require('../../../../src/util/paging');

describe('Testing data formats', { useTmpDir: true }, () => {
  let index;
  let createAndPersistEntity;
  let offerId;
  let updatedOfferModel;
  let updatedOfferIndex;
  let getIndices;
  let getDoc;
  let instantiateIndex;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.elasticsearchEndpoint });
      registerEntitiesForIndex(index);
    };
  });

  beforeEach(async () => {
    offerId = uuid4();
    createAndPersistEntity = async (dir, input) => {
      expect(await index.rest.mapping.create('offer')).to.equal(true);
      expect(await index.rest.alias.update('offer')).to.equal(true);
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
      expect(await index.rest.data.update('offer', [{
        action: 'update',
        doc: index.data.remap('offer', input)
      }])).to.equal(true);
      expect(await index.rest.data.refresh('offer')).to.equal(true);
    };
    const [offerModelPath, offerIndexPath] = ['models', 'indices']
      .map((v) => path.join(__dirname, '..', '..', '..', `${v}`, 'offer.json'));
    updatedOfferModel = sfs.smartRead(offerModelPath);
    updatedOfferIndex = sfs.smartRead(offerIndexPath);
    updatedOfferModel.fields.subhead = 'string';
    updatedOfferIndex.fields.push('subhead');

    getIndices = async () => {
      const r = await index.rest.call('GET', '_cat/indices');
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };

    getDoc = async (idx) => {
      const r = await index.rest.call('GET', idx, {
        endpoint: '_search',
        body: {
          _source: ['id', 'meta']
        }
      });
      return r.body.hits.hits;
    };
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing delete fails when signature and entity not exists', async () => {
    const r = await index.rest.data.update('offer', [{
      action: 'delete',
      id: offerId,
      signature: '0_1'
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
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      signature: null
    }])).to.equal(true);
    const r = await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      signature: null
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
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
    }])).to.equal(true);
    const signature = await index.rest.data.signature('offer', offerId);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      signature
    }])).to.equal(true);
    const r = await index.rest.data.update('offer', [{
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
    expect(await index.rest.data.update('offer', [{
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
    expect(await index.rest.data.update('offer', [{
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

  it('Testing update with signature in two versions', async ({ dir }) => {
    instantiateIndex();
    await createAndPersistEntity(dir, {
      id: offerId,
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
    });
    instantiateIndex();
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    await createAndPersistEntity(dir, {
      id: offerId,
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
    });
    // const signature = await index.rest.data.signature('offer', offerId);
    // await index.rest.data.update('offer', [{
    //   action: 'update',
    //   doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
    //   signature
    // }]);

    console.log(await getIndices())
    console.log(await getDoc('offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0', offerId))
    console.log(await getDoc('offer@6a1b8f491e156e356ab57e8df046b9f449acb440', offerId))
  });
});
