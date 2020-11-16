const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../src/index');
const { registerEntitiesForIndex } = require('../../helper');

describe('Testing rest', { useTmpDir: true }, () => {
  it('Testing responseHook.', async ({ dir }) => {
    // setup
    const index = Index({
      endpoint: process.env.elasticsearchEndpoint,
      responseHook: ({ request, response }) => {
        expect(Object.keys(request)).to.deep.equal(['headers', 'method', 'endpoint', 'index', 'body']);
        expect(Object.keys(response)).to.include.members(['statusCode', 'body', 'headers', 'timings']);
        expect(response.statusCode).to.equal(200);
      }
    });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);

    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect(await index.rest.data.update('offer', [{
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

  it('Testing disable auto index creation', async ({ dir }) => {
    // setup
    const index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);

    const offerId = uuid4();
    // index auto creation works by default
    expect(await index.rest.mapping.exists('offer')).to.equal(false);
    expect(await index.rest.data.update('offer', [{
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
    const r = await index.rest.data.update('offer', [{
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
});
