const { expect } = require('chai');
const { describe } = require('node-tdd');
const traverse = require('../../src/misc/traverse');

describe('Testing traverse', () => {
  it('Test all indices are equal', () => {
    const result = traverse(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(result).to.deep.equal({
      result: [],
      cursor: ['c', 'c']
    });
  });

  it('Test item missing from index', () => {
    const result = traverse(['a', 'b'], ['a', 'b', 'c']);
    expect(result).to.deep.equal({
      result: ['c'],
      cursor: ['b', 'c']
    });
  });

  it('Test many items missing from index', () => {
    const result = traverse(['a', 'e'], ['a', 'b', 'c']);
    expect(result).to.deep.equal({
      result: ['b', 'c'],
      cursor: ['a', 'c']
    });
  });

  it('Test with one index', () => {
    const result = traverse(['a', 'b', 'c']);
    expect(result).to.deep.equal({
      result: [],
      cursor: ['c']
    });
  });

  it('Test with one index empty', () => {
    const result = traverse([], ['a', 'b', 'c']);
    expect(result).to.deep.equal({
      result: ['a', 'b', 'c'],
      cursor: [undefined, 'c']
    });
  });

  it('Test one empty list', () => {
    const result = traverse([]);
    expect(result).to.equal(null);
  });

  it('Test multiple empty lists', () => {
    const result = traverse([], []);
    expect(result).to.equal(null);
  });

  it('Test some indices already paged', () => {
    const result = traverse(['a', 'b', 'c'], ['b', 'c']);
    expect(result).to.deep.equal({
      result: ['a'],
      cursor: ['c', 'c']
    });
  });
});
