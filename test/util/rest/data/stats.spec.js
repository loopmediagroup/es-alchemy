const { expect } = require('chai');
const Joi = require('joi-strict');
const { describe } = require('node-tdd');
const Index = require('../../../../src/index');

describe('Testing stats', () => {
  let index;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
  });

  it('Testing nodes stats', async () => {
    const schema = Joi.object().keys({
      _nodes: Joi.object(),
      cluster_name: Joi.string(),
      nodes: Joi.object()
        .pattern(Joi.string(), Joi.object()
          .keys({
            attributes: Joi.object(),
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
    expect(Joi.test(result.body, schema)).to.equal(true);
  });
});
