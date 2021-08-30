const objectEncode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
module.exports.objectEncode = objectEncode;

const objectDecode = (base64) => JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

module.exports.fromCursor = (cursor) => {
  const { limit, offset, searchAfter } = objectDecode(cursor);
  return { limit, offset, searchAfter };
};

const toCursor = ({
  limit = 20,
  offset = 0,
  searchAfter = []
} = {}) => objectEncode({ limit, offset, searchAfter });
module.exports.toCursor = toCursor;

const generatePage = ({
  hits = null,
  countReturned,
  countTotal,
  searchAfter,
  limit,
  offset
}) => {
  const noSearchAfter = !Array.isArray(searchAfter) || searchAfter.length === 0;
  const scroll = offset === 0 && countReturned === limit ? {
    limit,
    offset,
    ...(hits === null ? {} : { searchAfter: hits.hits[hits.hits.length - 1].sort })
  } : null;
  if (scroll !== null) {
    scroll.cursor = toCursor(scroll);
  }
  const next = noSearchAfter && countReturned === limit ? {
    limit,
    offset: offset + limit
  } : null;
  if (next !== null) {
    next.cursor = toCursor(next);
  }
  const previous = noSearchAfter && offset > 0 ? {
    limit,
    offset: Math.max(0, offset - limit)
  } : null;
  if (previous !== null) {
    previous.cursor = toCursor(previous);
  }
  return {
    scroll,
    next,
    previous,
    index: noSearchAfter ? {
      current: 1 + Math.ceil((offset * 1.0) / limit),
      max: Math.max(1, 1 + Math.floor((countTotal - 0.1) / limit))
    } : null,
    size: limit
  };
};
module.exports.generatePage = generatePage;

module.exports.buildPageObject = (hits, filter) => {
  const countReturned = hits.hits.length;
  const countTotal = hits.total.value;
  const searchAfter = filter.search_after;
  const limit = filter.size;
  const offset = filter.from;
  return generatePage({
    hits,
    countReturned,
    countTotal,
    searchAfter,
    limit,
    offset
  });
};
