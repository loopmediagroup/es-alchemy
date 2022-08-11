import get from 'lodash.get';
import { expect } from 'chai';
import { describe } from 'node-tdd';
import Index from '../../../src/index.js';
import filter from '../../../src/resources/action-map/filter.js';

const normalize = (q) => {
  const result = filter.search('name', q);
  const ws = get(result, 'bool.filter');
  return ws.map((w) => get(w, 'query_string.query'));
};

const normalizeOS = async (index, text) => {
  const { body } = await index.rest.call('GET', '', {
    endpoint: '_analyze?pretty',
    body: {
      tokenizer: 'standard',
      filter: [
        'lowercase',
        'asciifolding',
        'apostrophe'
      ],
      text
    }
  });
  return body.tokens
    .filter(({ type }) => type !== '<EMOJI>')
    .map(({ token }) => `${token}*`);
};

const t = async (index, text) => {
  const r1 = normalize(text);
  const r2 = await normalizeOS(index, text);
  expect(r1).to.deep.equal(r2);
};

describe('Testing search filter', () => {
  let index;
  before(() => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
  });

  it('Testing match words', async () => {
    await t(index, 'Crème Brulée garçon niÑo');
  });

  it('Testing match with dashes', async () => {
    await t(index, 'a-b c- -d -');
  });

  it('Testing match excluded chars', async () => {
    await t(index, "> = < 😀 ` ’ '");
  });

  it('Testing string containing quotes', async () => {
    await t(index, 'Use this "offer" so it’s permanently “Unavailable”');
  });

  it('Testing empty search', async () => {
    await t(index, '');
  });

  it('Testing apostrophe mid work', async () => {
    await t(index, "you’are`there'now");
  });

  it('Testing underscore', async () => {
    await t(index, 'you_are_here B_Dashboard _before after_ _both_');
  });

  it('Testing ascii folding', async () => {
    await t(index, 'FrFrç asd');
  });

  it('Testing dot separation', async () => {
    await t(index, 'first.last');
  });

  it('Testing plus separation', async () => {
    await t(index, 'first+last');
  });

  it('Testing email', async () => {
    await t(index, 'some.name+u10@test.com');
  });

  it('Testing dot suffix', async () => {
    await t(index, 'A. THE');
  });

  it('Testing underscore suffix', async () => {
    await t(index, 'A_ THE');
  });
});
