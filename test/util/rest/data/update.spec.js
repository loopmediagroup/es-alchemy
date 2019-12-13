const { expect } = require('chai');
const { describe } = require('node-tdd');
const Joi = require('joi-strict');
const uuid4 = require('uuid/v4');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing data formats', () => {
  let index;
  let offerId;

  beforeEach(async () => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing update fails when version null and entity exists', async () => {
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      version: null
    }])).to.equal(true);
    const r = await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } }),
      version: null
    }]);
    const schema = Joi.array().ordered(
      Joi.object().keys({
        create: Joi.object().keys({
          _index: Joi.string(),
          _type: Joi.string().valid('offer'),
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

  it('Testing update with version', async () => {
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v1' } })
    }])).to.equal(true);
    const version = await index.rest.data.version('offer', offerId);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v2' } }),
      version
    }])).to.equal(true);
    const r = await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', { id: offerId, meta: { k1: 'v3' } }),
      version
    }]);
    const schema = Joi.array().ordered(
      Joi.object().keys({
        update: Joi.object().keys({
          _index: Joi.string(),
          _type: Joi.string().valid('offer'),
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
        next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
        previous: null,
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
        next: { limit: 1, offset: 1, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxfQ==' },
        previous: null,
        index: {
          max: 1,
          current: 1
        },
        size: 1
      }
    });
  });
});
