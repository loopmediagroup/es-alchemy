import path from 'path';
import { expect } from 'chai';
import { describe } from 'node-tdd';
import fs from 'smart-fs';
import Index from '../../../../src/index.js';
import { registerEntitiesForIndex } from '../../../helper.js';

describe('Testing pruned', {
  useTmpDir: true
}, () => {
  let index;
  let instantiateIndex;
  let persistAndLoadVersion;
  let setupNewVersion;

  before(() => {
    instantiateIndex = () => {
      index = Index({ endpoint: process.env.opensearchEndpoint });
      registerEntitiesForIndex(index);
    };
    persistAndLoadVersion = (dir) => {
      expect(index.index.versions.persist(dir)).to.equal(true);
      expect(index.index.versions.load(dir)).to.equal(undefined);
    };
  });

  beforeEach(async ({ dir }) => {
    setupNewVersion = async () => {
      instantiateIndex();
      const [offerModelPath, offerIndexPath] = ['models', 'indices']
        .map((v) => path.join(fs.dirname(import.meta.url), '..', '..', '..', `${v}`, 'offer.json'));
      const updatedOfferModel = fs.smartRead(offerModelPath);
      const updatedOfferIndex = fs.smartRead(offerIndexPath);
      updatedOfferModel.fields.subhead = 'string';
      updatedOfferIndex.fields.push('subhead');
      index.model.register('offer', updatedOfferModel);
      index.index.register('offer', updatedOfferIndex);
      await persistAndLoadVersion(dir);
    };
    instantiateIndex();
    await persistAndLoadVersion(dir);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Test all remote versions exist locally', async () => {
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.pruned('offer')).to.equal(true);
  });

  it('Test no remote versions', async () => {
    expect(await index.rest.mapping.pruned('offer')).to.equal(true);
  });

  it('Test remote versions missing locally', async ({ dir }) => {
    await setupNewVersion();
    expect(await index.rest.mapping.apply('offer')).to.deep.equal([
      'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a',
      'offer@a61d200f03686939f0e9b2b924a6d8d7f5acf468'
    ]);
    instantiateIndex();
    fs.unlinkSync(path.join(dir, 'offer@c1d54c12486d569d308e2c6f3554b6146b35a60a.json'));
    expect(index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.mapping.pruned('offer')).to.equal(false);
  });
});
