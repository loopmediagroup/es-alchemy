module.exports = (...lists) => {
  const result = [];
  const cursor = [...Array(lists.length).keys()].map(() => 0);
  const len = Math.max(...lists.map(({ length }) => length));
  if (len === 0) {
    return null;
  }
  while (Math.max(...cursor) < len) {
    const docs = new Set();
    cursor.forEach((pos, idx) => {
      docs.add(lists[idx][pos]);
    });
    if (docs.size === 1) {
      cursor.forEach((pos, idx) => {
        cursor[idx] = pos + 1;
      });
    } else {
      const ordered = [...docs].sort();
      const lowest = ordered[0];
      result.push(lowest);
      cursor.forEach((pos, idx) => {
        if (lists[idx][pos] === lowest) {
          cursor[idx] = pos + 1;
        }
      });
    }
  }
  return {
    result,
    cursor: cursor.map((pos, idx) => lists[idx][Math.max(0, pos - 1)])
  };
};
