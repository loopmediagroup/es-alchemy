const get = require('lodash.get');
const expect = require('chai').expect;
const { describe } = require('node-tdd');
const { search } = require('../../../src/resources/action-map/filter');

const fn = (q) => {
  const result = search('name', q);
  const ws = get(result, 'bool.filter');
  return ws.map((w) => get(w, 'wildcard.name.value'));
};

describe('Testing search filter', () => {
  it('Testing match', () => {
    expect(fn('Crème Brulée garçon niÑo'))
      .to.deep.equal([
        'Crème*',
        'Brulée*',
        'garçon*',
        'niÑo*'
      ]);
  });
});
