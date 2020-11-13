const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing diverged', {
  useTmpDir: true,
  cryptoSeed: 'd9b0ed0b-a3d9-4cd6-85d8-0d090ad4bf3b'
}, () => {
  let index;
  let offerId;

  beforeEach(() => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    offerId = uuid4();
  });

  it('Testing diverged with one index', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.mapping.diverged('offer')).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId
      }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing diverged with one index and a cursor', async ({ dir }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.data.update('offer', [{
      action: 'update',
      doc: index.data.remap('offer', {
        id: offerId,
        headline: 'headline'
      })
    }])).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    const result = await index.rest.mapping.diverged('offer');
    expect(result).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': offerId
      }
    });
    expect(await index.rest.mapping.diverged('offer', result.cursor)).to.deep.equal({
      result: [],
      cursor: {
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': null
      }
    });
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing diverged with invalid cursor keys', async ({ dir, capture }) => {
    expect(await index.rest.mapping.create('offer')).to.equal(true);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
    const error = await capture(() => index.rest.mapping.diverged('offer', {
      result: [],
      cursor: {
        'offer@e35ec51a3c35e2d9982e1ac2bbe23957a637a9e0': '120ecadc-7344-4516-a54f-76b05111f47f',
        'offer@6a1b8f491e156e356ab57e8df046b9f449acb440': '120ecadc-7344-4516-a54f-76b05111f47f'
      }
    }));
    expect(error.message).to.equal('Invalid cursor keys');
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
