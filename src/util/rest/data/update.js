import assert from 'assert';
import Joi from 'joi-strict';
import aliasGet from '../alias/get.js';

export default async (call, versions, actions_) => {
  Joi.assert(actions_, Joi.array().items(Joi.object().keys({
    idx: Joi.string().valid(...versions.list()),
    action: Joi.string().valid('update', 'delete'),
    id: Joi.string().optional(),
    doc: Joi.object().keys({ id: Joi.string() }).unknown(true)
      .when('action', { is: Joi.string().valid('update'), then: Joi.required(), otherwise: Joi.optional() }),
    signature: Joi.string().pattern(/^(?:\d+_\d+|null)_[a-zA-Z\d-]+@[a-f\d]{40}$/).optional()
  }).or('id', 'doc')));

  const aliases = {};
  const uniqueIndices = [...new Set(actions_.map(({ idx }) => idx))];
  await Promise.all(uniqueIndices.map((idx) => (async () => {
    aliases[idx] = await aliasGet(call, idx);
  })()));

  const payload = [];
  actions_.forEach((action) => {
    const idx = action.idx;
    const alias = aliases[idx];
    const id = action.id || action.doc.id;
    const hasSignature = action.signature !== undefined;
    const isSignatureNull = hasSignature && action.signature.startsWith('null_');
    let signatureIndexVersion = null;
    let signatureStatic = {};
    if (hasSignature) {
      signatureIndexVersion = action.signature.split('_').pop();
      signatureStatic = {
        if_seq_no: null,
        if_primary_term: null
      };
      if (!isSignatureNull) {
        [
          signatureStatic.if_seq_no,
          signatureStatic.if_primary_term
        ] = action.signature.split('_');
      }
    }
    Object.entries(versions.get(idx)).forEach(([version, content]) => {
      const index = `${idx}@${version}`;
      const isAlias = index === alias;
      if (isAlias && isSignatureNull && action.action === 'delete') {
        return;
      }
      const signature = { ...signatureStatic };
      if (isAlias && hasSignature && alias !== signatureIndexVersion) {
        // force signature failure
        signature.if_seq_no = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        signature.if_primary_term = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);
      }
      payload.push({
        [isAlias && isSignatureNull && action.action === 'update' ? 'create' : action.action]: {
          _index: index,
          _id: id,
          ...(isAlias ? signature : {})
        }
      });
      if (action.action === 'update') {
        // `update` performs no action when exact document already indexed (reduced load)
        payload.push({
          doc: content.prepare(action.doc),
          doc_as_upsert: !isAlias || !hasSignature
        });
      }
    });
  });

  if (payload.length === 0) {
    return true;
  }
  const r = await call('POST', '', {
    endpoint: '_bulk',
    body: payload.map((e) => JSON.stringify(e)).concat('').join('\n'),
    headers: { 'content-type': 'application/x-ndjson' },
    json: false
  });
  assert(r.statusCode === 200, r.body);
  if (r.body.errors === false) {
    return true;
  }
  return r.body.items;
};
