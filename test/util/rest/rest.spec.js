const { expect } = require('chai');
const { describe } = require('node-tdd');
const uuid4 = require('uuid/v4');
const Index = require('../../../src/index');
const { registerEntitiesForIndex } = require('../../helper');

describe('Testing rest', () => {
  it('Testing responseHook.', async () => {
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

    const offerId = uuid4();
    expect(await index.rest.mapping.create('offer')).to.equal(true);
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
});
