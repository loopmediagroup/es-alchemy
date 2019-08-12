module.exports = {
  and: (f) => ({
    bool: {
      filter: f
    }
  }),
  or: (f) => ({
    bool: {
      should: f,
      minimum_should_match: 1
    }
  }),
  not: (f) => ({
    bool: {
      must_not: f
    }
  })
};
