const { expect } = require('chai');
const Index = require('../../src/index');
const { toCursor } = require('../../src/util/paging');
const { registerEntitiesForIndex, query } = require('../helper');

describe('Testing Query Creation', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
  });

  it('Testing query.build', () => {
    Object.entries(query).forEach(([k, v]) => {
      const result = index.query.build(null, {
        toReturn: v.toReturn || [''],
        filterBy: v.filterBy || [],
        orderBy: v.orderBy || [],
        scoreBy: v.scoreBy || [],
        limit: v.limit,
        offset: v.offset
      });
      expect(result, `Debug: ${JSON.stringify(result)}`).to.deep.equalInAnyOrder(v.result);
    });
  });

  it('Testing query.build with defaults', () => {
    expect(index.query.build()).to.deep.equal({
      _source: [''],
      size: 20,
      from: 0,
      sort: [{ id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with cursor.', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 })
    })).to.deep.equal({
      _source: [''],
      size: 10,
      from: 10,
      sort: [{ id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with cursor limit override.', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 }),
      limit: 15
    })).to.deep.equal({
      _source: [''],
      size: 15,
      from: 10,
      sort: [{ id: { order: 'asc' } }]
    });
  });
});
