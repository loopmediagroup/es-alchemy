const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe, upsert, query } = require('../../../helper-filter');

describe('Testing filter timeboxes', () => {
  it('Testing timeboxes', async () => {
    const entity1 = {
      id: `@${uuid4()}`,
      timeboxes: ['live|2021-07-20T17:53:39.700Z|2021-07-27T17:53:39.700Z|America/Vancouver|0123']
    };
    const entity2 = {
      id: `#${uuid4()}`,
      timeboxes: ['discoverable|2021-07-20T17:53:39.700Z|2021-07-27T17:53:39.700Z|America/Vancouver|0123']
    };
    await upsert('entity', [entity1, entity2]);
    await Promise.all([
      {
        filterBy: ['timeboxes', 'timeboxes', 'live', '2021-07-21T18:25:10.025Z'],
        result: [entity1]
      },
      {
        filterBy: ['timeboxes', 'timeboxes', 'discoverable', '2021-07-21T18:25:10.025Z'],
        result: [entity2]
      }
    ].map(async ({ filterBy, result }) => {
      const r = await query('entity', {
        toReturn: [
          'id',
          'timeboxes'
        ],
        filterBy
      });
      expect(r, `${filterBy}`).to.deep.equal(result);
    }));
  });
});
