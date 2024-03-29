import { expect } from 'chai';
import { describe } from 'node-tdd';
import { v4 as uuid4 } from 'uuid';
import Index from '../../src/index.js';
import { registerEntitiesForIndex } from '../helper.js';

describe('Testing lifecycle', { timeout: 10000, useTmpDir: true }, () => {
  let index;

  beforeEach(({ dir }) => {
    index = Index({ endpoint: process.env.opensearchEndpoint });
    registerEntitiesForIndex(index);
    expect(index.index.versions.persist(dir)).to.equal(true);
    expect(index.index.versions.load(dir)).to.equal(undefined);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('offer')).to.equal(true);
  });

  it('Testing lifecycle', async () => {
    // eslint-disable-next-line no-underscore-dangle
    const mappingHash = index.index.getMapping('offer').mappings._meta.hash;
    const uuids = [uuid4(), uuid4(), uuid4()].sort();
    await index.rest.mapping.delete('offer');
    expect(await index.rest.mapping.list()).to.deep.equal([]);
    expect(await index.rest.mapping.apply('offer')).to.deep.equal(['offer@c1d54c12486d569d308e2c6f3554b6146b35a60a']);
    expect(await index.rest.mapping.apply('offer')).to.deep.equal([]);
    expect(await index.rest.mapping.list()).to.deep.equal(['offer']);
    expect(await index.rest.alias.update('offer')).to.equal(true);
    expect((await index.rest.mapping.get('offer')).body[`offer@${mappingHash}`])
      .to.deep.equal(index.index.getMapping('offer'));
    const filter1 = index.query.build();
    const queryResult1 = await index.rest.data.query('offer', filter1);
    expect(index.data.page(queryResult1, filter1)).to.deep.equal({
      payload: [],
      page: {
        next: null,
        previous: null,
        scroll: null,
        index: {
          current: 1,
          max: 1
        },
        size: 20
      }
    });
    expect(await index.rest.data.update(uuids.map((id) => ({
      idx: 'offer',
      action: 'update',
      doc: {
        id
      }
    })))).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(3);
    const filter2 = index.query.build('offer', {
      toReturn: ['id'],
      filterBy: { and: [['id', 'in', uuids]] },
      limit: 1,
      offset: 1
    });
    const queryResult2 = await index.rest.data.query('offer', filter2);
    expect(index.data.page(queryResult2, filter2)).to.deep.equal({
      payload: [{ id: uuids[1] }],
      page: {
        next: { limit: 1, offset: 2, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjoyLCJzZWFyY2hBZnRlciI6W119' },
        previous: { limit: 1, offset: 0, cursor: 'eyJsaW1pdCI6MSwib2Zmc2V0IjowLCJzZWFyY2hBZnRlciI6W119' },
        scroll: null,
        index: {
          max: 3,
          current: 2
        },
        size: 1
      }
    });
    expect(await index.rest.data.update(uuids.map((id) => ({
      idx: 'offer',
      action: 'delete',
      id
    })))).to.equal(true);
    expect(await index.rest.data.refresh('offer')).to.equal(true);
    expect(await index.rest.data.count('offer')).to.equal(0);
  });
});
