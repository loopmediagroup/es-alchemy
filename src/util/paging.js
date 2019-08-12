const objectEncode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

const objectDecode = (base64) => JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

module.exports.fromCursor = (cursor) => {
  const { limit, offset } = objectDecode(cursor);
  return { limit, offset };
};

const toCursor = ({ limit = 20, offset = 0 } = {}) => objectEncode({ limit, offset });
module.exports.toCursor = toCursor;

module.exports.buildPageObject = (countReturned, countTotal, limit, offset) => {
  const next = countReturned === limit ? {
    limit,
    offset: offset + limit
  } : null;
  if (next !== null) {
    next.cursor = toCursor(next);
  }
  const previous = offset > 0 ? {
    limit,
    offset: Math.max(0, offset - limit)
  } : null;
  if (previous !== null) {
    previous.cursor = toCursor(previous);
  }
  return {
    next,
    previous,
    index: {
      current: 1 + Math.ceil((offset * 1.0) / limit),
      max: Math.max(1, 1 + Math.floor((countTotal - 0.1) / limit))
    },
    size: limit
  };
};
