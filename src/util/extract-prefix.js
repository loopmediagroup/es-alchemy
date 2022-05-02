import assert from 'assert';

export default (field, allowedFields) => {
  const allowedParent = allowedFields === null
    ? field
    : [field, field.slice(0, field.lastIndexOf('.'))].find((f) => allowedFields.includes(f));
  assert(allowedParent !== undefined, `Bad field provided: ${field}`);
  const pos = allowedParent.lastIndexOf('.');
  return pos === -1 ? '' : field.slice(0, pos);
};
