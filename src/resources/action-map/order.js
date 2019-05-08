const crypto = require('crypto');

module.exports = {
  distance: (l, loc) => ({
    _geo_distance: Object.assign({
      [l]: loc,
      order: 'asc',
      unit: 'm',
      mode: 'min',
      distance_type: 'arc'
    }, l.indexOf('.') === -1 ? {} : { nested_path: l.substring(0, l.lastIndexOf('.')) })
  }),
  random: (_, seed) => ({
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
  random_boost: (_, seed, filter_, frequency) => ({
    _script: {
      script: {
        lang: 'painless',
        inline: (
          // Reference: http://burtleburtle.net/bob/hash/integer.html
          `
if (${Object.entries(filter_).map(([k, v]) => `doc['${k}'].value == '${v}'`).join(' && ')}) {
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
  asc: (l, mode = null) => ({
    [l]: Object.assign(
      { order: 'asc' },
      mode !== null ? { mode } : {},
      l.indexOf('.') === -1 ? {} : { nested_path: l.substring(0, l.lastIndexOf('.')) }
    )
  }),
  desc: (l, mode = null) => ({
    [l]: Object.assign(
      { order: 'desc' },
      mode !== null ? { mode } : {},
      l.indexOf('.') === -1 ? {} : { nested_path: l.substring(0, l.lastIndexOf('.')) }
    )
  })
};
