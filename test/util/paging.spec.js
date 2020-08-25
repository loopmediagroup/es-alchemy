const { expect } = require('chai');
const { describe } = require('node-tdd');
const { toCursor, fromCursor } = require('../../src/util/paging');

describe('Testing paging.', () => {
  it('Testing toCursor', () => {
    expect(toCursor({ limit: 10, offset: 0 }))
      .to.equal('eyJsaW1pdCI6MTAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ==');
    expect(toCursor())
      .to.equal('eyJsaW1pdCI6MjAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ==');
  });

  it('Testing fromCursor', () => {
    expect(fromCursor('eyJsaW1pdCI6MjAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ=='))
      .to.deep.equal({ limit: 20, offset: 0, searchAfter: [] });
  });
});
