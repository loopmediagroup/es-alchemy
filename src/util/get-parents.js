module.exports = fields => fields.reduce((p, field) => {
  p.push(...field.split(".").slice(0, -1).reduce((prev, next) => {
    prev.push((prev[prev.length - 1] || []).concat([next]));
    return prev;
  }, []).map(e => e.join(".")));
  return p;
}, []);
