module.exports = fields => Array.from(fields.reduce((p, field) => {
  field
    .split(".")
    .slice(0, -1)
    .reduce((prev, next) => {
      prev.push((prev[prev.length - 1] || []).concat([next]));
      return prev;
    }, [])
    .map(e => e.join("."))
    .forEach(e => p.add(e));
  return p;
}, new Set()));
