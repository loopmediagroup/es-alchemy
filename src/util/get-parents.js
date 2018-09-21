module.exports = fields => Array.from(fields
  .reduce((prev, cur) => cur
    .split("")
    .map((e, idx) => (e === "." ? idx : -1))
    .filter(pos => pos !== -1)
    .reduce((p, c) => p.add(cur.slice(0, c)), prev), new Set()));
