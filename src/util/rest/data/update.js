const assert = require('assert');
const set = require('lodash.set');
const Joi = require('joi-strict');
const objectScan = require('object-scan');

module.exports = async (...args) => {
  // todo: delete with signature, delete against alias index, and delete from others
  // todo: delete without signature, delete from others

  Joi.assert(args, Joi.array().ordered(
    Joi.func(),
    Joi.string(),
    Joi.object(),
    Joi.object(),
    Joi.array().items(Joi.object().keys({
      action: Joi.string().valid('update', 'delete'),
      id: Joi.string().optional(),
      doc: Joi.object().keys({ id: Joi.string() }).unknown(true)
        .when('action', { is: Joi.string().valid('update'), then: Joi.required(), otherwise: Joi.optional() }),
      signature: Joi.string().pattern(/^\d+_\d+$/).optional()
        .when('action', { is: Joi.string().valid('update'), then: Joi.allow(null) })
    }).or('id', 'doc'))
  ));
  const [call, idx, rels, mapping, actions] = args;
  actions.forEach((action) => {
    if (action.id === undefined) {
      Object.assign(action, { id: action.doc.id });
    }
  });

  // generate clones of data for update and prune as needed for mapping
  // generate clones of delete actions for other mappings

  // eslint-disable-next-line no-underscore-dangle
  const index = `${idx}@${mapping.mappings._meta.hash}`;
  const payload = [];

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
    .forEach((action) => {
      const hasSignature = action.signature !== undefined;
      const isSignatureNull = action.signature === null;
      let signature = {};
      if (hasSignature) {
        signature = {
          if_seq_no: null,
          if_primary_term: null
        };
        if (!isSignatureNull) {
          [
            signature.if_seq_no,
            signature.if_primary_term
          ] = action.signature.split('_');
        }
      }
      payload.push(JSON.stringify({
        [isSignatureNull ? 'create' : action.action]: {
          _index: index,
          _id: action.id,
          ...signature
        }
      }));
      if (action.action === 'update') {
        emptyToNull(action.doc);
        // `update` performs no action when exact document already indexed (reduced load)
        payload.push(JSON.stringify({ doc: action.doc, doc_as_upsert: !hasSignature }));
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
