import path from 'path';
import { expect } from 'chai';
import { describe } from 'node-tdd';
import fs from 'smart-fs';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing prune', {
  useTmpDir: true
}, () => {
  let instantiateIndex;
  let updatedOfferModel;
  let updatedOfferIndex;
  let index;
  let getIndices;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.opensearchEndpoint });
      registerEntitiesForIndex(index);
    };
    const [offerModelPath, offerIndexPath] = ['models', 'indices']
      .map((v) => path.join(fs.dirname(import.meta.url), '..', '..', '..', `${v}`, 'offer.json'));
    updatedOfferModel = fs.smartRead(offerModelPath);
    updatedOfferIndex = fs.smartRead(offerIndexPath);
    updatedOfferModel.fields.subhead = 'string';
    updatedOfferIndex.fields.push('subhead');
  });

  beforeEach(() => {
    instantiateIndex();
    getIndices = async () => {
      const r = await index.rest.call('GET', '_cat/indices');
      return r.body.map(({ index: indexVersion }) => indexVersion);
    };
  });

  it('Test pruning an old index', async ({ dir }) => {
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.model.register('offer', updatedOfferModel);
    index.index.register('offer', updatedOfferIndex);
    expect(index.index.versions.persist(dir)).to.equal(true);
    index.index.versions.load(dir);
    expect((await index.rest.mapping.apply('offer')).sort()).to.deep.equal([
      'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468',
      'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a'
    ]);
    expect((await getIndices()).sort()).to.deep.equal([
      'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468',
      'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a'
    ]);
    instantiateIndex();
    fs.unlinkSync(path.join(dir, 'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468.json'));
    index.index.versions.load(dir);
    expect(await index.rest.mapping.prune('offer')).to.deep.equal(['offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468']);
    expect(await getIndices()).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });
});
