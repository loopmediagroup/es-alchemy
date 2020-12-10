const crypto = require('crypto');

const { buildQuery } = require('../../util/filter');

module.exports = {
  distance: ([l, p, loc]) => ({
    _geo_distance: {
      [l]: loc,
      order: 'asc',
      unit: 'm',
      mode: 'min',
      distance_type: 'arc',
      ...(p === null ? {} : { nested: { path: p } })
    }
  }),
  random: ([l, p, seed]) => ({
    _script: {
      script: {
        lang: 'painless',
        inline: (
          // Reference: http://burtleburtle.net/bob/hash/integer.html
          "int a = [doc['id'].value, params.seed].hashCode();"
          + 'a -= (a<<6);a ^= (a>>17);a -= (a<<9);a ^= (a<<4);'
          + 'a -= (a<<3);a ^= (a<<10);a ^= (a>>15);return a;'
        ),
        params: {
          seed: crypto.createHash('md5').update(String(seed)).digest('hex')
        }
      },
      type: 'number',
      order: 'asc'
    }
  }),
  random_boost: ([l, p, seed, filter, frequency]) => ({
    _script: {
      script: {
        lang: 'painless',
        inline: (
          // Reference: http://burtleburtle.net/bob/hash/integer.html
          `
if (${Object.entries(filter).map(([k, v]) => `doc['${k}'].value == '${v}'`).join(' && ')}) {
int a = [doc['id'].value, params.seed].hashCode();
a -= (a<<6);a ^= (a>>17);a -= (a<<9);a ^= (a<<4);
a -= (a<<3);a ^= (a<<10);a ^= (a>>15);
return a % ${frequency} == 0 ? 0 : 1;} else {return 1;}
`
        ),
        params: {
          seed: crypto.createHash('md5').update(String(seed)).digest('hex')
        }
      },
      type: 'number',
      order: 'asc'
    }
  }),
  asc: ([l, p, mode = null, filter = null], ctx) => ({
    [l]: {
      order: 'asc',
      ...(mode !== null ? { mode } : {}),
      ...(p === null ? {} : {
        nested: {
          path: p,
          ...(filter === null ? {} : {
            filter: buildQuery(filter, ctx.allowedFields, p)
          })
        }
      })
    }
  }),
  desc: ([l, p, mode = null, filter = null], ctx) => ({
    [l]: {
      order: 'desc',
      ...(mode !== null ? { mode } : {}),
      ...(p === null ? {} : {
        nested: {
          path: p,
          ...(filter === null ? {} : {
            filter: buildQuery(filter, ctx.allowedFields, p)
          })
        }
      })
    }
  })
};
