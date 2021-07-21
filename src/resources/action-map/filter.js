module.exports = {
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
  '<': (l, r) => ({
    range: {
      [l]: {
        lt: r
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
  '>': (l, r) => ({
    range: {
      [l]: {
        gt: r
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
  exists: (l) => ({
    exists: {
      field: l
    }
  }),
  notexists: (l) => ({
    bool: {
      must_not: {
        exists: {
          field: l
        }
      }
    }
  }),
  prefix: (l, r) => ({
    prefix: {
      [l]: {
        value: r
      }
    }
  }),
  notprefix: (l, r) => ({
    bool: {
      must_not: {
        prefix: {
          [l]: {
            value: r
          }
        }
      }
    }
  }),
  search: (l, r) => ({
    bool: {
      filter: (r.match(/(?:[a-zA-Z0-9À-ÖØ-öø-ÿ]|\b[-'’]\b)+/g) || [])
        .filter((e) => !!e)
        .map((e) => ({
          query_string: {
            default_field: l,
            query: `${e}*`
          }
        }))
    }
  }),
  intersects: (l, r) => ({
    bool: {
      filter: {
        geo_shape: {
          [l]: {
            shape: {
              type: r.length === 2 && r.every((p) => typeof p === 'number')
                ? 'point'
                : 'polygon',
              coordinates: r
            },
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
  }),
  timeboxes: (l, type, ts) => ({
    bool: {
      filter: {
        script: {
          script: {
            source: `
for (int i = 0; i < doc[params.field].length; i++) {
  String timebox = doc[params.field][i];
  String[] meta = timebox.splitOnToken('|');
  if (
    (meta[0] == params.type)
    && (meta[1].compareTo(params.nowIso) < 0)
    && (meta[2].compareTo(params.nowIso) > 0)
    && meta[4].indexOf(
      Integer.toString(Instant.ofEpochMilli(params.nowMs).atZone(ZoneId.of(meta[3])).dayOfWeek.getValue() - 1)
    ) !== -1
  ) {
    return true;
  }
}
return false;
`,
            lang: 'painless',
            params: {
              field: l,
              type,
              nowMs: new Date(ts) / 1,
              nowIso: ts
            }
          }
        }
      }
    }
  })
};
