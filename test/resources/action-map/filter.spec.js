const expect = require('chai').expect;
const { describe } = require('node-tdd');
const fn = require('./helper');

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
