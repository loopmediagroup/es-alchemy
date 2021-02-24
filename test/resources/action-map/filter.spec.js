const get = require('lodash.get');
const expect = require('chai').expect;
const { describe } = require('node-tdd');
const { search } = require('../../../src/resources/action-map/filter');

const normalize = (q) => {
  const result = search('name', q);
  const ws = get(result, 'bool.filter');
  return ws.map((w) => get(w, 'query_string.query'));
};

describe('Testing search filter', () => {
  it('Testing match words', () => {
    expect(normalize('Crème Brulée garçon niÑo'))
      .to.deep.equal(['Crème*', 'Brulée*', 'garçon*', 'niÑo*']);
  });

  it('Testing match with dashes', () => {
    expect(normalize('a-b c- -d'))
      .to.deep.equal(['a-b*', 'c*', 'd*']);
  });

  it('Testing match excluded chars', () => {
    expect(normalize('> = < 😀'))
      .to.deep.equal([]);
  });

  it('Testing string containing quotes', () => {
    expect(normalize('Use this "offer" so it’s permanently “Unavailable”'))
      .to.deep.equal([
        'Use*',
        'this*',
        'offer*',
        'so*',
        'it’s*',
        'permanently*',
        'Unavailable*'
      ]);
  });

  it('Testing empty search', () => {
    expect(normalize(''))
      .to.deep.equal([]);
  });
});
