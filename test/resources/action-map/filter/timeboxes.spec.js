const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe, upsert, query } = require('../../../helper-filter');

const genTimebox = ({
  type = 'live',
  start = '2021-07-20T00:00:00.000Z',
  end = '2021-07-27T00:00:00.000Z',
  timezone = 'UTC',
  days = [0, 1, 2, 3, 4, 5, 6]
}) => [
  type,
  start,
  end,
  timezone,
  days.join('')
].join('|');

const mkEntity = async (params) => {
  const entity = { id: `@${uuid4()}`, timeboxes: [genTimebox(params)] };
  await upsert('entity', [entity]);
  return entity;
};

const verify = async (entity, filter, rtn) => {
  const filterBy = ['timeboxes', 'timeboxes', ...filter];
  const r = await query('entity', { toReturn: ['id', 'timeboxes'], filterBy });
  expect(r, `${filterBy}`).to.deep.equal(rtn ? [entity] : []);
};

describe('Testing filter timeboxes', () => {
  it('Testing return inclusive', async () => {
    const entity = await mkEntity({});
    await verify(entity, ['live', '2021-07-20T00:00:00.000Z'], true);
    await verify(entity, ['live', '2021-07-19T23:59:59.999Z'], false);
    await verify(entity, ['live', '2021-07-27T00:00:00.000Z'], true);
    await verify(entity, ['live', '2021-07-27T00:00:00.001Z'], false);
  });

  it('Testing by type', async () => {
    const entity = await mkEntity({});
    await verify(entity, ['live', '2021-07-23T00:00:00.000Z'], true);
    await verify(entity, ['discoverable', '2021-07-23T00:00:00.000Z'], false);
  });

  it('Testing by weekday', async () => {
    const entity = await mkEntity({
      days: [5]
    });
    await verify(entity, ['live', '2021-07-23T12:00:00.000Z'], true);
    await verify(entity, ['live', '2021-07-22T12:00:00.000Z'], false);
  });

  it('Testing by timezone difference', async () => {
    const entity = await mkEntity({
      timezone: 'America/Vancouver',
      days: [5]
    });
    await verify(entity, ['live', '2021-07-23T12:00:00.000Z'], true);
    await verify(entity, ['live', '2021-07-23T06:00:00.000Z'], false);
    await verify(entity, ['live', '2021-07-24T06:00:00.000Z'], true);
  });
});
