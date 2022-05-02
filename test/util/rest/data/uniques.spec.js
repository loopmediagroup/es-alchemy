import { expect } from 'chai';
import { v4 as uuid4 } from 'uuid';
import { describe, upsert } from '../../../helper-filter.js';

const setupData = async () => {
  await upsert('person', [
    { id: uuid4(), name: 'a', surname: 'x' },
    { id: uuid4(), name: 'a', surname: 'x' },
    { id: uuid4(), name: 'b', surname: 'x' },
    { id: uuid4(), name: 'c', surname: 'x' },
    { id: uuid4(), name: 'b', surname: 'x' },
    { id: uuid4(), name: 'a', surname: 'x' },
    { id: uuid4(), name: 'a', surname: 'y' }
  ]);
};

describe('Testing uniques()', (index) => {
  it('Testing simple base case', async () => {
    const person1 = { id: uuid4(), name: 'Lars' };
    const person2 = { id: uuid4(), name: 'Lars' };
    await upsert('person', [person1, person2]);
    const r1 = await index().rest.data.uniques('person', 'name.raw');
    expect(r1.uniques).to.deep.equal(['Lars']);
  });

  it('Testing nested', async () => {
    const person1 = {
      id: uuid4(),
      name: 'Lars',
      children: [
        { id: uuid4(), name: 'John' },
        { id: uuid4(), name: 'David' }
      ]
    };
    const person2 = { id: uuid4(), name: 'Lars', children: [{ id: uuid4(), name: 'John' }] };
    await upsert('person', [person1, person2]);
    const r1 = await index().rest.data.uniques('person', 'children.name.raw');
    expect(r1.uniques).to.deep.equal(['David', 'John']);
  });

  it('Testing multiple nested with top level', async () => {
    const person1 = {
      id: '7339941e-465e-46e1-bf53-1bce23d69bbe',
      name: 'Lars',
      children: [
        {
          id: 'abfe6701-f181-4a4b-b6a5-2ba16fb9d2a3',
          name: 'John'
        },
        {
          id: '028ea4b3-e420-4ed7-ba9d-c416ada2e796',
          name: 'Jane'
        }
      ]
    };
    const person2 = {
      id: 'fe034213-dfbb-4411-8735-ee193a5209ce',
      name: 'Lars',
      children: [
        {
          id: '0692008d-1c99-415f-9aa5-574cbca3c852',
          name: 'David'
        },
        {
          id: 'e6ee14ef-a0d0-4ed4-9bf6-3149e48dc1dc',
          name: 'Mary'
        }
      ]
    };
    await upsert('person', [person1, person2]);
    const r1 = await index().rest.data.uniques('person', ['children.name.raw', 'children.id']);
    expect(r1.uniques).to.deep.equal([
      ['David', '0692008d-1c99-415f-9aa5-574cbca3c852'],
      ['Jane', '028ea4b3-e420-4ed7-ba9d-c416ada2e796'],
      ['John', 'abfe6701-f181-4a4b-b6a5-2ba16fb9d2a3'],
      ['Mary', 'e6ee14ef-a0d0-4ed4-9bf6-3149e48dc1dc']
    ]);
  });

  it('Testing multiple uniques', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', [
      'surname.raw',
      'name.raw'
    ]);
    expect(r1.uniques).to.deep.equal([
      ['x', 'a'],
      ['x', 'b'],
      ['x', 'c'],
      ['y', 'a']
    ]);
  });

  it('Testing multiple uniques with count', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', [
      'surname.raw',
      'name.raw'
    ], { count: true });
    expect(r1.uniques).to.deep.equal([
      [['x', 'a'], 3],
      [['x', 'b'], 2],
      [['x', 'c'], 1],
      [['y', 'a'], 1]
    ]);
  });

  it('Test single page with count', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', 'name.raw', { count: true });
    expect(r1.uniques).to.deep.equal([['a', 4], ['b', 2], ['c', 1]]);
    expect('cursor' in r1).to.equal(false);
  });

  it('Test single item paging', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', 'name.raw', { limit: 1 });
    expect(r1.uniques).to.deep.equal(['a']);
    expect('cursor' in r1).to.equal(true);

    const r2 = await index().rest.data.uniques('person', 'name.raw', { cursor: r1.cursor });
    expect(r2.uniques).to.deep.equal(['b']);
    expect('cursor' in r2).to.equal(true);

    const r3 = await index().rest.data.uniques('person', 'name.raw', { cursor: r2.cursor });
    expect(r3.uniques).to.deep.equal(['c']);
    expect('cursor' in r3).to.equal(true);

    const r4 = await index().rest.data.uniques('person', 'name.raw', { cursor: r3.cursor });
    expect(r4.uniques).to.deep.equal([]);
    expect('cursor' in r4).to.equal(false);
  });

  it('Test two item paging', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', 'name.raw', { limit: 2 });
    expect(r1.uniques).to.deep.equal(['a', 'b']);
    expect('cursor' in r1).to.equal(true);

    const r2 = await index().rest.data.uniques('person', 'name.raw', { cursor: r1.cursor });
    expect(r2.uniques).to.deep.equal(['c']);
    expect('cursor' in r2).to.equal(false);
  });

  it('Test single page', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', 'name.raw');
    expect(r1.uniques).to.deep.equal(['a', 'b', 'c']);
    expect('cursor' in r1).to.equal(false);
  });

  it('Test filter option', async () => {
    await setupData();
    const r1 = await index().rest.data.uniques('person', 'name.raw', {
      filterBy: { and: [['name', 'in', ['a', 'b']]] }
    });
    expect(r1.uniques).to.deep.equal(['a', 'b']);
    expect('cursor' in r1).to.equal(false);
  });

  it('Test bad unique field', async ({ capture }) => {
    await setupData();
    const err = await capture(() => index().rest.data.uniques('person', 'name'));
    expect(JSON.stringify(err)).to.include(
      'Text fields are not optimised for operations that require per-document field data '
      + 'like aggregations and sorting, so these operations are disabled by default. Please '
      + 'use a keyword field instead.'
    );
  });

  it('Test limit and cursor provided', async ({ capture }) => {
    await setupData();
    const err = await capture(() => index().rest.data.uniques('person', 'name.raw', { limit: 1, cursor: '123' }));
    expect(err.message).to.include('"limit" must not exist simultaneously with [cursor]');
  });
});
