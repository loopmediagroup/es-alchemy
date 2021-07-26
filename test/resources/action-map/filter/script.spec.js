const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe, upsert, query } = require('../../../helper-filter');

const getTimeline = (type, {
  startDate = '2021-07-20T00:00:00.000Z',
  endDate = '2021-07-27T00:00:00.000Z',
  timezones = ['UTC'],
  weekDays = [0, 1, 2, 3, 4, 5, 6]
} = {}) => ({
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
    const entity = await genEntity([getTimeline('live')]);
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
      getTimeline('live'),
      getTimeline('discoverable')
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

  it('Testing complex script', async () => {
    const entity = await genEntity([
      getTimeline('t1', { weekDays: [5] }),
      getTimeline('t2', { weekDays: [0, 1, 2, 3, 4, 6] })
    ]);
    const now = '2021-07-23T12:00:00.000Z';
    const genFilterBy = (type) => ({
      and: [
        ['timelines.type', '==', type],
        ['timelines.startDate', '<=', now],
        ['timelines.endDate', '>=', now],
        ['timelines.id', 'script', {
          source: `
for (tz in doc[params.timezones]) {
  if (doc[params.weekDays].contains(
    Instant.ofEpochMilli(params.nowMs).atZone(ZoneId.of(tz)).dayOfWeek.getValue() % 7L
  )) {
    return true;
  }
}
return false;
`,
          params: {
            nowMs: new Date(now) / 1,
            timezones: 'timelines.timezones',
            weekDays: 'timelines.weekDays'
          },
          lang: 'painless'
        }]
      ]
    });
    await exec(entity, genFilterBy('t1'), true);
    await exec(entity, genFilterBy('t2'), false);
  });
});
