const assert = require('assert');
const Joi = require('joi-strict');
const aliasGet = require('../alias/get');

module.exports = async (call, idx, versions, actions_) => {
  Joi.assert(actions_, Joi.array().items(Joi.object().keys({
    action: Joi.string().valid('update', 'delete'),
    id: Joi.string().optional(),
    doc: Joi.object().keys({ id: Joi.string() }).unknown(true)
      .when('action', { is: Joi.string().valid('update'), then: Joi.required(), otherwise: Joi.optional() }),
    signature: Joi.string().pattern(/^\d+_\d+$/).optional()
      .when('action', { is: Joi.string().valid('update'), then: Joi.allow(null) })
  }).or('id', 'doc')));

  const alias = await aliasGet(call, idx);

  const payload = [];
  actions_.forEach((action) => {
    const id = action.id || action.doc.id;
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
    Object.entries(versions).forEach(([version, content]) => {
      const index = `${idx}@${version}`;
      payload.push(JSON.stringify({
        [isSignatureNull ? 'create' : action.action]: {
          _index: index,
          _id: id,
          ...(index === alias ? signature : {})
        }
      }));
      if (action.action === 'update') {
        // `update` performs no action when exact document already indexed (reduced load)
        payload.push(JSON.stringify({
          doc: content.prepare(action.doc),
          doc_as_upsert: !hasSignature
        }));
      }
    });
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
