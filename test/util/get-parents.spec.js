const expect = require("chai").expect;
const getParents = require("../../src/util/get-parents");

describe('Testing get-parents.spec.js', () => {
  it('Testing basic', () => {
    expect(getParents(["child", "", "parent.child", "grandparent.parent.child"]))
      .to.deep.equal(['parent', 'grandparent', 'grandparent.parent']);
  });

  it('Testing de-duplication', () => {
    expect(getParents(["grandparent.parent.child", "grandparent.parent.child"]))
      .to.deep.equal(['grandparent', 'grandparent.parent']);
  });
});
