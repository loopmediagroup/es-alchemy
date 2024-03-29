import { expect } from 'chai';
import Joi from 'joi-strict';
import { describe } from 'node-tdd';
import Index from '../../../../src/index.js';

describe('Testing stats', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
  });

  it('Testing nodes stats', async () => {
    const schema = Joi.object().keys({
      _nodes: Joi.object(),
      cluster_name: Joi.string(),
      nodes: Joi.object()
        .pattern(Joi.string(), Joi.object()
          .keys({
            indices: Joi.object(),
            os: Joi.object().keys({
              cpu: Joi.object().keys({
                load_average: Joi.object().keys({
                  '1m': Joi.number(),
                  '5m': Joi.number(),
                  '15m': Joi.number()
                })
              }).unknown()
            }).unknown()
          }).unknown())
    });
    const result = await index.rest.data.stats();
    expect(Joi.test(result, schema)).to.equal(true);
  });
});
