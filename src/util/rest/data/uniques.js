const get = require('lodash.get');
const Joi = require('joi-strict');
const { fromCursor, toCursor } = require('../../paging');
const { buildQuery } = require('../../filter');

module.exports = (call, idx, allowedFields, field, opts) => {
  Joi.assert(opts, Joi.object().keys({
    filterBy: Joi.object().optional(),
    limit: Joi.number().integer().min(1).optional(),
    cursor: Joi.string().optional()
  }).nand('limit', 'cursor'));
  const cursorPayload = opts.cursor === undefined ? null: fromCursor(opts.cursor);
  const after = get(cursorPayload, 'searchAfter', null);
  const limit = get(cursorPayload, 'limit', get(opts, 'limit', 20));
  const body = {
    size: 0,
    aggs: {
      uniques: {
        composite: {
          ...(after === null ? {} : { after }),
          size: limit,
          sources: [
            { [field]: { terms: { field } } }
          ]
        }
      }
    }
  };
  if ('filterBy' in opts) {
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
      const { uniques } = r.body.aggregations;
      const result = {
        uniques: uniques.buckets.map((e) => e.key[field])
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
