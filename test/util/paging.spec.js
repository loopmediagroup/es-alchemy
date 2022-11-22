import { expect } from 'chai';
import { describe } from 'node-tdd';
import { toCursor, fromCursor, generatePage } from '../../src/util/paging.js';

describe('Testing paging.', () => {
  it('Testing toCursor', () => {
    expect(toCursor({ limit: 10, offset: 0 }))
      .to.equal('eyJsaW1pdCI6MTAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ==');
    expect(toCursor())
      .to.equal('eyJsaW1pdCI6MjAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ==');
  });

  it('Testing fromCursor', () => {
    expect(fromCursor({ cursor: 'eyJsaW1pdCI6MjAsIm9mZnNldCI6MCwic2VhcmNoQWZ0ZXIiOltdfQ==' }))
      .to.deep.equal({ limit: 20, offset: 0, searchAfter: [] });
  });

  it('Testing generatePage without hits', () => {
    expect(generatePage({
      countReturned: 1,
      countTotal: 3,
      limit: 1,
      offset: 0
    })).to.deep.equal({
      scroll: {
        limit: 1,
        offset: 0,
        cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowLCJzZWFyY2hBZnRlciI6W119'
      },
      next: {
        limit: 1,
        offset: 1,
        cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoxLCJzZWFyY2hBZnRlciI6W119'
      },
      previous: null,
      index: { current: 1, max: 3 },
      size: 1
    });
  });
});
