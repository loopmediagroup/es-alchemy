module.exports.fromCursor = cursor => JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

const toCursor = ({ limit = 20, offset = 0 } = {}) => Buffer
  .from(JSON.stringify({ size: limit, from: offset })).toString('base64');
module.exports.toCursor = toCursor;

module.exports.buildPageObject = (countReturned, countTotal, limit, offset) => {
  const next = countReturned === limit ? {
    limit,
    offset: offset + limit,
    cursor: toCursor({ limit, offset: offset + limit })
  } : null;
  const previous = offset > 0 ? {
    limit,
    offset: Math.max(0, offset - limit),
    cursor: toCursor({ limit, offset: Math.max(0, offset - limit) })
  } : null;
  return {
    next,
    previous,
    index: {
      current: 1 + Math.ceil(offset * 1.0 / limit),
      max: Math.max(1, 1 + Math.floor((countTotal - 0.1) / limit))
    },
    size: limit
  };
};
