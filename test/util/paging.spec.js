import { expect } from 'chai';
import { describe } from 'node-tdd';
import { toCursor, fromCursor, generatePage } from '../../src/util/paging.js';

describe('Testing paging.', () => {
  let cursorSecret;

  before(() => {
    cursorSecret = 'secret';
  });

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

  it('Testing cursor secret', () => {
    const cursorPayload = { limit: 10, offset: 10, searchAfter: [] };
    const cursor = toCursor({ ...cursorPayload, cursorSecret });
    expect(cursor).to.equal('eyJsaW1pdCI6MTAsIm9mZnNldCI6MTAsInNlYXJjaEFmdGVyIjpbXX0=_dTAv7E6IZQ+wHptaBIxmcA');
    expect(fromCursor({ cursor, cursorSecret }))
      .to.deep.equal(cursorPayload);
  });

  it('Testing cursor secret signature mismatch', () => {
    const originalCursor = toCursor({ limit: 10, offset: 10, cursorSecret });
    const [, signature] = originalCursor.split('_');
    const unknownCursor = toCursor({ searchAfter: ['Unknown'] });
    const cursor = [unknownCursor, signature].join('_');
    expect(fromCursor({ cursor, cursorSecret }))
      .to.deep.equal({});
  });

  it('Testing cursor with signature and no secret provided', () => {
    const cursorPayload = { limit: 10, offset: 10, searchAfter: [] };
    const cursor = toCursor({ ...cursorPayload, cursorSecret });
    expect(cursor).to.equal('eyJsaW1pdCI6MTAsIm9mZnNldCI6MTAsInNlYXJjaEFmdGVyIjpbXX0=_dTAv7E6IZQ+wHptaBIxmcA');
    expect(fromCursor({ cursor }))
      .to.deep.equal(cursorPayload);
  });

  it('Testing cursor with with no signature and secret provided', () => {
    const cursorPayload = { limit: 10, offset: 10, searchAfter: [] };
    const cursor = toCursor({ ...cursorPayload });
    expect(cursor).to.equal('eyJsaW1pdCI6MTAsIm9mZnNldCI6MTAsInNlYXJjaEFmdGVyIjpbXX0=');
    expect(fromCursor({ cursor, cursorSecret }))
      .to.deep.equal({});
  });
});
