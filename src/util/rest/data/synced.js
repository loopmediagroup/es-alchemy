import count from './count.js';

export default async ({
  call,
  versions,
  esas = null,
  idx
}) => {
  const logic = esas === null
    ? Object.keys(versions.get(idx)).map((version) => [`${idx}@${version}`, call])
    : esas.map((esa) => [idx, esa.rest.call]);
  const countResult = await Promise.all(logic
    .map(([i, c]) => count({ call: c, idx: i })));
  if (countResult.some((c) => !Number.isInteger(c))) {
    return false;
  }
  return countResult.every((c, _, arr) => c === arr[0]);
};
