import { expect } from 'chai';
import { describe } from 'node-tdd';
import { v4 as uuid4 } from 'uuid';
import Index from '../../../src/index.js';
import { registerEntitiesForIndex } from '../../helper.js';

describe('Testing rest', { useTmpDir: true }, () => {
  let init;
  let offerId;

  beforeEach(({ dir }) => {
    init = async (opts = {}) => {
      // setup
      const index = Index({
        endpoint: process.env.opensearchEndpoint,
        ...opts
      });
      registerEntitiesForIndex(index);
      expect(await index.index.versions.persist(dir)).to.equal(true);
      expect(await index.index.versions.load(dir)).to.equal(undefined);
      return index;
    };
    offerId = uuid4();
  });

  it('Testing responseHook.', async () => {
    const index = await init({
      responseHook: ({ request, response }) => {
        expect(Object.keys(request)).to.deep.equal(['headers', 'method', 'endpoint', 'index', 'body']);
        expect(Object.keys(response)).to.include.members(['statusCode', 'body', 'headers', 'timings']);
        expect(response.statusCode).to.equal(200);
      }
    });

    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: {
        id: offerId
      }
    }])).to.equal(true);
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

  it('Testing disable auto index creation', async () => {
    const index = await init();
    // index auto creation works by default
    expect(await index.rest.mapping.exists('offer')).to.equal(false);
    expect(await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: {
        id: offerId
      }
    }])).to.equal(true);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);

    // update setting
    const r1 = await index.rest.call('PUT', '', {
      endpoint: '_cluster/settings',
      body: {
        persistent: {
          'action.auto_create_index': 'false'
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(r1.body).to.deep.equal({
      acknowledged: true,
      persistent: { action: { auto_create_index: 'false' } },
      transient: {}
    });

    // index auto creation no longer works
    expect(await index.rest.mapping.exists('offer')).to.equal(false);
    const r = await index.rest.data.update([{
      idx: 'offer',
      action: 'update',
      doc: {
        id: offerId
      }
    }]);
    expect(r[0].update.error.type).to.equal('index_not_found_exception');

    // restore setting
    const r2 = await index.rest.call('PUT', '', {
      endpoint: '_cluster/settings',
      body: {
        persistent: {
          'action.auto_create_index': 'true'
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(r2.body).to.deep.equal({
      acknowledged: true,
      persistent: { action: { auto_create_index: 'true' } },
      transient: {}
    });
  });

  it('Testing call without options', async () => {
    const index = await init();
    registerEntitiesForIndex(index);
    expect((await index.rest.call('GET', uuid4())).statusCode).to.equal(404);
  });

  it('Testing aws credentials', async () => {
    const index = await init({
      aws: {
        region: 'us-west-2',
        sessionToken: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
        secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      }
    });
    registerEntitiesForIndex(index);
    expect((await index.rest.call('GET', uuid4())).statusCode).to.equal(404);
  });
});
