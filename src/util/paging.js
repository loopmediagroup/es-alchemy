
module.exports.fromCursor = cursor => JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

const pageToCursor = obj => (obj !== null
  ? Buffer.from(JSON.stringify({ size: obj.limit, from: obj.offset })).toString('base64')
  : null);
module.exports.pageToCursor = pageToCursor;

module.exports.buildPageObject = (resultLength, resultTotal, size, from) => {
  const next = resultLength === size ? {
    limit: size,
    offset: from + size
  } : null;
  const previous = from > 0 ? {
    limit: size,
    offset: Math.max(0, from - size)
  } : null;
  return {
    next,
    previous,
    cursor: {
      next: pageToCursor(next),
      previous: pageToCursor(previous)
    },
    current: 1 + Math.ceil(from * 1.0 / size),
    max: Math.max(1, 1 + Math.floor((resultTotal - 0.1) / size)),
    size
  };
};
