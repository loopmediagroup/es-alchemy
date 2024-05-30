import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../src/index.js';
import { toCursor } from '../../src/util/paging.js';
import { registerEntitiesForIndex, query } from '../helper.js';

describe('Testing Query Creation', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
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
      // fs.smartWrite(
      //   path.join(fs.dirname(import.meta.url), '..', 'query', `${k}.json`),
      //   { ...v, result }
      // );
      expect(result, `Debug: ${JSON.stringify(result)}`).to.deep.equalInAnyOrder(v.result);
    });
  });

  it('Testing query.build with defaults', () => {
    expect(index.query.build()).to.deep.equal({
      _source: [''],
      size: 20,
      from: 0,
      sort: [{ _id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with cursor', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 })
    })).to.deep.equal({
      _source: [''],
      size: 10,
      from: 10,
      sort: [{ _id: { order: 'asc' } }]
    });
  });

  it('Testing cursor extract', () => {
    const content = { limit: 10, offset: 10 };
    expect(index.cursor.extract(toCursor(content))).to.deep.equal({
      ...content,
      searchAfter: []
    });
  });

  it('Testing query.build with cursor limit override', () => {
    expect(index.query.build(undefined, {
      cursor: toCursor({ limit: 10, offset: 10 }),
      limit: 15
    })).to.deep.equal({
      _source: [''],
      size: 15,
      from: 10,
      sort: [{ _id: { order: 'asc' } }]
    });
  });

  it('Testing query.build with alphabetization support', () => {
    const q = 'Crème Brulée garçon niÑo';
    const andFilter = [
      ['name', 'search', q]
    ];
    expect(index.query.build(null, {
      filterBy: { and: andFilter }
    })).to.deep.equal({
      _source: [''],
      size: 20,
      from: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    query_string: {
                      default_field: 'name',
                      query: 'creme*'
                    }
                  },
                  {
                    query_string: {
                      default_field: 'name',
                      query: 'brulee*'
                    }
                  },
                  {
                    query_string: {
                      default_field: 'name',
                      query: 'garcon*'
                    }
                  },
                  {
                    query_string: {
                      default_field: 'name',
                      query: 'nino*'
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      sort: [{ _id: { order: 'asc' } }]
    });
  });
});
