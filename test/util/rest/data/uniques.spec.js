const { expect } = require('chai');
const { describe } = require('node-tdd');
const { v4: uuid4 } = require('uuid');
const Index = require('../../../../src/index');
const { registerEntitiesForIndex } = require('../../../helper');

describe('Testing uniques', { useTmpDir: true }, () => {
  let index;
  let createAddress;

  beforeEach(async ({ dir }) => {
    index = Index({ endpoint: process.env.elasticsearchEndpoint });
    registerEntitiesForIndex(index);
    expect(await index.index.versions.persist(dir)).to.equal(true);
    expect(await index.index.versions.load(dir)).to.equal(undefined);
    expect(await index.rest.mapping.create('address')).to.equal(true);
    expect(await index.rest.alias.update('address')).to.equal(true);
    createAddress = (street, city = 'Brisbane') => index.rest.data.update([{
      idx: 'address',
      action: 'update',
      doc: index.data.remap('address', { id: uuid4(), street, city })
    }]);
    expect(await createAddress('a')).to.equal(true);
    expect(await createAddress('a')).to.equal(true);
    expect(await createAddress('b')).to.equal(true);
    expect(await createAddress('c')).to.equal(true);
    expect(await createAddress('b')).to.equal(true);
    expect(await createAddress('a')).to.equal(true);
    expect(await index.rest.data.refresh('address')).to.equal(true);
  });

  afterEach(async () => {
    expect(await index.rest.mapping.delete('address')).to.equal(true);
  });

  it('Testing multiple uniques', async () => {
    expect(await createAddress('a', 'Sydney')).to.equal(true);
    expect(await index.rest.data.refresh('address')).to.equal(true);
    const r1 = await index.rest.data.uniques('address', [
      'city.raw',
      'street.raw'
    ]);
    expect(r1.uniques).to.deep.equal([
      ['Brisbane', 'a'],
      ['Brisbane', 'b'],
      ['Brisbane', 'c'],
      ['Sydney', 'a']
    ]);
  });

  it('Test single item paging', async () => {
    const r1 = await index.rest.data.uniques('address', 'street.raw', { limit: 1 });
    expect(r1.uniques).to.deep.equal(['a']);
    expect('cursor' in r1).to.equal(true);

    const r2 = await index.rest.data.uniques('address', 'street.raw', { cursor: r1.cursor });
    expect(r2.uniques).to.deep.equal(['b']);
    expect('cursor' in r2).to.equal(true);

    const r3 = await index.rest.data.uniques('address', 'street.raw', { cursor: r2.cursor });
    expect(r3.uniques).to.deep.equal(['c']);
    expect('cursor' in r3).to.equal(true);

    const r4 = await index.rest.data.uniques('address', 'street.raw', { cursor: r3.cursor });
    expect(r4.uniques).to.deep.equal([]);
    expect('cursor' in r4).to.equal(false);
  });

  it('Test two item paging', async () => {
    const r1 = await index.rest.data.uniques('address', 'street.raw', { limit: 2 });
    expect(r1.uniques).to.deep.equal(['a', 'b']);
    expect('cursor' in r1).to.equal(true);

    const r2 = await index.rest.data.uniques('address', 'street.raw', { cursor: r1.cursor });
    expect(r2.uniques).to.deep.equal(['c']);
    expect('cursor' in r2).to.equal(false);
  });

  it('Test single page', async () => {
    const r1 = await index.rest.data.uniques('address', 'street.raw');
    expect(r1.uniques).to.deep.equal(['a', 'b', 'c']);
    expect('cursor' in r1).to.equal(false);
  });

  it('Test filter option', async () => {
    const r1 = await index.rest.data.uniques('address', 'street.raw', {
      filterBy: { and: [['street', 'in', ['a', 'b']]] }
    });
    expect(r1.uniques).to.deep.equal(['a', 'b']);
    expect('cursor' in r1).to.equal(false);
  });

  it('Test bad unique field', async ({ capture }) => {
    const err = await capture(() => index.rest.data.uniques('address', 'street'));
    expect(JSON.stringify(err)).to.include('Fielddata is disabled on text fields by default');
  });

  it('Test limit and cursor provided', async ({ capture }) => {
    const err = await capture(() => index.rest.data.uniques('address', 'street.raw', { limit: 1, cursor: '123' }));
    expect(err.message).to.include('"limit" must not exist simultaneously with [cursor]');
  });
});
