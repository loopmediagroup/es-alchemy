const { expect } = require('chai');
const { toCursor, fromCursor } = require('../../src/util/paging');

describe('Testing paging.', () => {
  it('Testing toCursor.', () => {
    expect(toCursor({ limit: 10, offset: 0 })).to.equal('eyJzaXplIjoxMCwiZnJvbSI6MH0=');
    expect(toCursor()).to.equal('eyJzaXplIjoyMCwiZnJvbSI6MH0=');
  });

  it('Testing fromCursor', () => {
    expect(fromCursor('eyJzaXplIjoxMCwiZnJvbSI6MH0=')).to.deep.equal({ size: 10, from: 0 });
  });
});
