const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe, upsert, query } = require('../../../helper-filter');

const getTimeline = ({
  type = 'live',
  startDate = '2021-07-20T00:00:00.000Z',
  endDate = '2021-07-27T00:00:00.000Z',
  timezones = ['UTC'],
  weekDays = [0, 1, 2, 3, 4, 5, 6]
}) => ({
  id: uuid4(),
  type,
  startDate,
  endDate,
  timezones,
  weekDays
});

const genEntity = async (timelines) => {
  const entity = { id: uuid4(), timelines };
  await upsert('entity', [entity]);
  return entity;
};

const exec = async (entity, filterBy, rtn) => {
  const r = await query('entity', {
    toReturn: [
      'id',
      'timelines.id',
      'timelines.type',
      'timelines.startDate',
      'timelines.endDate',
      'timelines.timezones',
      'timelines.weekDays'
    ],
    filterBy
  });
  expect(r, `${filterBy}`).to.deep.equal(rtn ? [entity] : []);
};

describe('Testing script', () => {
  it('Testing filter by live (script)', async () => {
    const entity = await genEntity([getTimeline({ type: 'live' })]);
    const filterBy = {
      and: [
        ['timelines.id', 'script', {
          source: "return doc['timelines.type'].value == 'live';",
          lang: 'painless'
        }]
      ]
    };
    await exec(entity, filterBy, true);
  });

  it('Testing filter by live (script) and discoverable (non script)', async () => {
    const entity = await genEntity([
      getTimeline({ type: 'live' }),
      getTimeline({ type: 'discoverable' })
    ]);
    const filterBy = {
      and: [
        ['timelines.type', '==', 'discoverable'],
        ['timelines.id', 'script', {
          source: "return doc['timelines.type'].value == 'live';",
          lang: 'painless'
        }]
      ]
    };
    await exec(entity, filterBy, false);
  });
});
