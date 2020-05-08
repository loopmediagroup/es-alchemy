const assert = require('assert');
const set = require('lodash.set');
const Joi = require('joi-strict');
const objectScan = require('object-scan');
const historic = require('../mapping/historic');

module.exports = async (...args) => {
  Joi.assert(args, Joi.array().ordered(
    Joi.func(),
    Joi.string(),
    Joi.object(),
    Joi.object(),
    Joi.array().items(Joi.object().keys({
      action: Joi.string().valid('update', 'delete', 'touch'),
      id: Joi.string().optional(),
      doc: Joi.object().keys({
        id: Joi.string()
      }).unknown(true)
        .when('action', { is: Joi.string().valid('update'), then: Joi.required(), otherwise: Joi.optional() }),
      version: Joi.number().integer().optional().min(0)
        .when('action', { is: Joi.string().valid('update'), then: Joi.allow(null) })
        .when('action', { is: Joi.string().valid('touch'), then: Joi.forbidden() })
    }).or('id', 'doc'))
  ));
  const [call, idx, rels, mapping, actions] = args;
  actions.forEach((action) => {
    if (action.id === undefined) {
      Object.assign(action, { id: action.doc.id });
    }
  });

  const oldVersionsEntries = Object.entries(await historic(call, idx, mapping));
  const oldVersionsEmpty = oldVersionsEntries.filter(([_, docCount]) => docCount === 0).map(([name, _]) => name);
  const oldVersionsNonEmpty = oldVersionsEntries.filter(([_, docCount]) => docCount !== 0).map(([name, _]) => name);

  if (oldVersionsEmpty.length !== 0) {
    // delete old, empty versions
    await Promise.all(oldVersionsEmpty.map((i) => call('DELETE', i)));
  }

  // eslint-disable-next-line no-underscore-dangle
  const index = `${idx}@${mapping.mappings._meta.hash}`;
  const payload = [];

  // delete elements from old index versions
  actions.map((action) => action.id)
    .forEach((docId) => oldVersionsNonEmpty
      .forEach((i) => payload.push(JSON.stringify({ delete: { _index: i, _type: idx, _id: docId } }))));

  // todo: can reduce traversal, but need good tests first / possibly need to adjust object-scan
  const emptyToNull = (() => {
    const relsToCheck = Object.entries(rels)
      .filter(([_, v]) => v.endsWith('[]'))
      .map(([k]) => k);
    const scanner = objectScan(relsToCheck, {
      useArraySelector: false,
      joined: false,
      breakFn: ({
        getKey, getValue, isMatch, context
      }) => {
        if (isMatch) {
          const value = getValue();
          if (Array.isArray(value) && value.length === 0) {
            const key = getKey();
            set(context.input, key, null);
          }
        }
      }
    });
    return (input) => {
      scanner(input, { input });
    };
  })();

  actions
    .filter((action) => action.action !== 'touch')
    .forEach((action) => {
      payload.push(JSON.stringify({
        [action.version === null ? 'create' : action.action]: {
          _index: index,
          _id: action.id,
          version: action.version
        }
      }));
      if (action.action === 'update') {
        emptyToNull(action.doc);
        // `update` performs no action when exact document already indexed (reduced load)
        payload.push(JSON.stringify({ doc: action.doc, doc_as_upsert: true }));
      }
    });

  if (payload.length === 0) {
    return true;
  }
  const r = await call('POST', '', {
    endpoint: '_bulk',
    body: payload.concat('').join('\n'),
    headers: { 'content-type': 'application/x-ndjson' },
    json: false
  });
  assert(r.statusCode === 200, r.body);
  const body = JSON.parse(r.body);
  if (body.errors === false) {
    return true;
  }
  return body.items;
};
