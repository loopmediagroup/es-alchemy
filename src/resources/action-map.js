const crypto = require('crypto');
const assert = require('assert');

module.exports = {
  bool: {
    and: f => ({
      bool: {
        filter: f
      }
    }),
    or: f => ({
      bool: {
        should: f,
        minimum_should_match: 1
      }
    }),
    not: f => ({
      bool: {
        must_not: f
      }
    })
  },
  filter: {
    nest: (p, l) => ({
      nested: {
        path: p,
        query: {
          bool: {
            filter: l
          }
        }
      }
    }),
    '==': (l, r) => ({
      match: {
        [l]: {
          query: r,
          operator: 'and'
        }
      }
    }),
    '<=': (l, r) => ({
      range: {
        [l]: {
          lte: r
        }
      }
    }),
    '>=': (l, r) => ({
      range: {
        [l]: {
          gte: r
        }
      }
    }),
    between: (l, gte, lte) => ({
      range: {
        [l]: {
          gte,
          lte
        }
      }
    }),
    contains: (l, loc) => ({
      geo_shape: {
        [l]: {
          relation: 'contains',
          shape: {
            type: 'point',
            coordinates: loc
          }
        }
      }
    }),
    containedBy: (l, r) => ({
      bool: {
        filter: {
          geo_polygon: {
            [l]: {
              points: r
            }
          }
        }
      }
    }),
    distance: (l, loc, dist) => ({
      geo_distance: {
        distance: dist,
        [l]: loc
      }
    }),
    in: (l, r) => ({
      terms: {
        [l]: r
      }
    }),
    notin: (l, r) => ({
      bool: {
        must_not: {
          terms: {
            [l]: r
          }
        }
      }
    }),
    exists: l => ({
      bool: {
        exists: {
          field: l
        }
      }
    }),
    notexists: l => ({
      bool: {
        must_not: {
          exists: {
            field: l
          }
        }
      }
    }),
    search: (l, r) => ({
      bool: {
        filter: r.toLowerCase().split(/[^0-9a-z]+/)
          .filter(e => !!e)
          .map(e => ({
            wildcard: {
              [l]: {
                value: `${e}*`
              }
            }
          }))
      }
    }),
    intersects: (l, r) => ({
      bool: {
        filter: {
          geo_shape: {
            [l]: {
              shape: r.length === 2 && r.every(p => typeof p === 'number')
                ? { type: 'point', coordinates: r }
                : { type: 'polygon', coordinates: [r] },
              relation: 'intersects'
            }
          }
        }
      }
    }),
    boundedBy: (l, r) => ({
      bool: {
        filter: {
          geo_bounding_box: {
            'pin.location': {
              top_left: [r[0], r[1]],
              bottom_right: [r[2], r[3]]
            }
          }
        }
      }
    })
  },
  order: {
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
  },
  score: {
    random: (seed, scaleField) => ({
      script_score: {
        script: {
          lang: 'painless',
          inline: `
int a = [doc['id'].value, params.seed].hashCode();
a -= (a<<6);a ^= (a>>17);a -= (a<<9);a ^= (a<<4);
a -= (a<<3);a ^= (a<<10);a ^= (a>>15);
double scale = Collections.max(doc[params.scale_field].getValues()) / 100.0;
double value = (Math.abs(a) / (double)Integer.MAX_VALUE) - 0.5;
return scale * value
`,
          params: {
            seed,
            scale_field: scaleField // as percentage
          }
        }
      }
    }),
    bool: f => ({
      script_score: {
        script: {
          lang: 'painless',
          inline: 'return doc[params.field].values.contains(true) ? 1 : 0;',
          params: {
            field: f
          }
        }
      }
    }),
    '==': (l, r, scaleValue = 1) => {
      assert(typeof scaleValue === 'number');
      return {
        script_score: {
          script: {
            lang: 'painless',
            inline: 'return (doc[params.l].values.contains(params.r) ? 1 : 0) * params.scale_value;',
            params: {
              l,
              r,
              scale_value: scaleValue
            }
          }
        }
      };
    },
    distance: (l, loc, offsetInM, scaleInM = null) => ({
      script_score: {
        script: {
          lang: 'painless',
          inline: `
double scale = ${typeof scaleInM === 'number' ? scaleInM : 'Collections.max(doc[params.scale_field].getValues())'};
double lambda = Math.log(params.decay) / scale;
double score = Double.MAX_VALUE;
double lat2 = params.lat;
double lon2 = params.lon;
double TO_METERS = 6371008.7714D;
double TO_RADIANS = Math.PI / 180D;
for (int i = 0; i < doc[params.field].values.length; i++) {
  // todo: https://github.com/elastic/elasticsearch/issues/25796
  double lat1 = doc[params.field][i].lat;
  double lon1 = doc[params.field][i].lon;
  double x1 = lat1 * TO_RADIANS;
  double x2 = lat2 * TO_RADIANS;
  double h1 = 1 - Math.cos(x1 - x2);
  double h2 = 1 - Math.cos((lon1 - lon2) * TO_RADIANS);
  double h = h1 + Math.cos(x1) * Math.cos(x2) * h2;
  double dist = TO_METERS * 2 * Math.asin(Math.min(1, Math.sqrt(h * 0.5)));
  // http://tiny.cc/ylp2oy
  double cscore = Math.exp(lambda * Math.max(0, dist - params.offset));
  score = Math.min(score, cscore);
}
return score; `,
          params: {
            field: l,
            lon: loc[0],
            lat: loc[1],
            offset: offsetInM,
            scale_field: scaleInM,
            decay: 0.5
          }
        }
      }
    })
  }
};
