const path = require('path');
const expect = require('chai').expect;
const { v4: uuid4 } = require('uuid');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');
const {
  readDir,
  registerAndCreateEntity,
  removeEntity,
  upsert,
  query
} = require('../../../helper-filter');

describe('Testing filter prefix', {
  useTmpDir: true
}, () => {
  let index;
  let idx;
  let mdl;

  before(() => {
    const dir = readDir(path.join(__dirname, 'prefix'));
    idx = dir.index;
    mdl = dir.models;
  });

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    await registerAndCreateEntity(index, mdl, idx, dir);
  });

  afterEach(async () => {
    await removeEntity(index);
  });

  it('Testing prefix', async () => {
    const entity1 = { id: `@${uuid4()}` };
    const entity2 = { id: `#${uuid4()}` };
    await upsert(index, 'entity', [entity1, entity2]);
    await Promise.all([
      {
        filterBy: ['id', 'prefix', '@'],
        result: [entity1]
      },
      {
        filterBy: ['id', 'prefix', '#'],
        result: [entity2]
      },
      {
        filterBy: ['id', 'notprefix', '@'],
        result: [entity2]
      },
      {
        filterBy: ['id', 'notprefix', '#'],
        result: [entity1]
      }
    ].map(async ({ filterBy, result }) => {
      expect(await query(index, 'entity', {
        toReturn: ['id'],
        filterBy
      }), `${filterBy}`).to.deep.equal(result);
    }));
  });
});
