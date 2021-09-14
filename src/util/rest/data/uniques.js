const assert = require('assert');
const get = require('lodash.get');
const Joi = require('joi-strict');
const { getParents } = require('object-fields');
const { fromCursor, toCursor } = require('../../paging');
const { buildQuery } = require('../../filter');

module.exports = (call, idx, allowedFields, fields, opts) => {
  Joi.assert(opts, Joi.object().keys({
    filterBy: Joi.object().optional(),
    limit: Joi.number().integer().min(1).optional(),
    cursor: Joi.string().optional(),
    count: Joi.boolean().optional()
  }).nand('limit', 'cursor'));
  const cursorPayload = opts.cursor === undefined ? null : fromCursor(opts.cursor);
  const after = get(cursorPayload, 'searchAfter', null);
  const limit = get(cursorPayload, 'limit', get(opts, 'limit', 20));
  const count = opts.count === undefined ? false : opts.count;
  const prefix = (Array.isArray(fields) ? fields : [fields]).reduce((prev, field) => {
    const parents = [field, ...getParents([field]).reverse()];
    const allowedParent = parents.find((f) => allowedFields.includes(f));
    assert(allowedParent !== undefined, `Bad field provided: ${field}`);
    const pos = allowedParent.lastIndexOf('.');
    const prefixForField = pos === -1 ? null : field.slice(0, pos);
    assert(prev === undefined || prefixForField === prev, `Multiple prefix provided: ${prev} vs ${prefixForField}`);
    return prefixForField;
  }, undefined);
  const body = {
    size: 0,
    aggs: {
      uniques: {
        composite: {
          ...(after === null ? {} : { after }),
          size: limit,
          sources: (Array.isArray(fields) ? fields : [fields])
            .map((field) => ({ [field]: { terms: { field } } }))
        }
      }
    }
  };
  if (prefix !== null) {
    body.aggs = { sub: { nested: { path: prefix }, aggs: body.aggs } };
  }
  if (opts.filterBy !== undefined) {
    body.query = buildQuery(opts.filterBy, allowedFields);
  }
  return call('POST', idx, {
    body,
    endpoint: '_search'
  })
    .then((r) => {
      if (r.statusCode !== 200) {
        throw r.body;
      }
      const { uniques } = prefix === null ? r.body.aggregations : r.body.aggregations.sub;
      const result = {
        uniques: uniques.buckets.map((e) => {
          const value = Array.isArray(fields)
            ? fields.map((field) => e.key[field])
            : e.key[fields];
          return count ? [value, e.doc_count] : value;
        })
      };
      if (uniques.buckets.length === limit) {
        result.cursor = toCursor({
          limit,
          searchAfter: uniques.after_key
        });
      }
      return result;
    });
};
