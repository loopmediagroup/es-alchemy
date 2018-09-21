module.exports = fields => Array.from(fields.reduce((p, field) => {
  field
    .split(".")
    .slice(0, -1)
    .reduce((prev, next) => {
      prev.push(prev.length === 0 ? next : `${prev[prev.length - 1]}.${next}`);
      return prev;
    }, [])
    .forEach(e => p.add(e));
  return p;
}, new Set()));
