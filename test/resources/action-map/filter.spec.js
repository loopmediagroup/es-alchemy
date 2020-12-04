const expect = require('chai').expect;
const { describe } = require('node-tdd');
const { search } = require('../../../src/resources/action-map/filter');

describe('Testing search filter', () => {
  it('Testing match', () => {
    const q = 'Crème Brulée garçon niÑo';
    expect(search('name', q)).to.deep.equal({
      bool: {
        filter: [
          {
            wildcard: {
              name: {
                value: 'Crème*'
              }
            }
          },
          {
            wildcard: {
              name: {
                value: 'Brulée*'
              }
            }
          },
          {
            wildcard: {
              name: {
                value: 'garçon*'
              }
            }
          },
          {
            wildcard: {
              name: {
                value: 'niÑo*'
              }
            }
          }
        ]
      }
    });
  });
});
