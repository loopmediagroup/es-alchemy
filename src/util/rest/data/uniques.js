import assert from 'assert';
import get from 'lodash.get';
import Joi from 'joi-strict';
import { fromCursor, toCursor } from '../../paging.js';
import { buildQuery } from '../../filter.js';
import extractPrefix from '../../extract-prefix.js';
import { normalize } from '../../index.js';

export default ({
  call,
  idx,
  allowedFields,
  fields,
  opts,
  cursorSecret
}) => {
  Joi.assert(opts, Joi.object().keys({
    filterBy: Joi.object().optional(),
    limit: Joi.number().integer().min(1).optional(),
    cursor: Joi.string().optional(),
    count: Joi.boolean().optional()
  }).nand('limit', 'cursor'));
  assert(
    (Array.isArray(fields) ? fields : [fields]).every((f) => allowedFields.includes(f)),
    'Unexpected field provided'
  );
  const cursorPayload = opts.cursor === undefined ? null : fromCursor({ cursor: opts.cursor });
  const after = get(cursorPayload, 'searchAfter', null);
  const limit = get(cursorPayload, 'limit', get(opts, 'limit', 20));
  const count = opts.count === undefined ? false : opts.count;
  const prefixes = new Set((Array.isArray(fields) ? fields : [fields])
    .map((field) => extractPrefix(field, allowedFields)));
  assert(prefixes.size === 1, `Multiple prefix provided: ${prefixes}`);
  const prefix = prefixes.values().next().value;
  const body = {
    size: 0,
    aggs: {
      uniques: {
        composite: {
          ...(after === null ? {} : { after }),
          size: limit,
          sources: (Array.isArray(fields) ? fields : [fields])
            .map((f) => normalize(f))
            .map((field) => ({ [field]: { terms: { field } } }))
        }
      }
    }
  };
  if (prefix !== '') {
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
      const { uniques } = prefix === '' ? r.body.aggregations : r.body.aggregations.sub;
      const result = {
        uniques: uniques.buckets.map((e) => {
          const value = Array.isArray(fields)
            ? fields.map((field) => e.key[normalize(field)])
            : e.key[normalize(fields)];
          return count ? [value, e.doc_count] : value;
        })
      };
      if (uniques.buckets.length === limit) {
        result.cursor = toCursor({
          limit,
          searchAfter: uniques.after_key,
          cursorSecret
        });
      }
      return result;
    });
};
