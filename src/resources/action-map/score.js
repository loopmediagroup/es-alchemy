import assert from 'assert';
import { buildQuery } from '../../util/filter.js';
import extractPrefix from '../../util/extract-prefix.js';

const remap = `
double remap(def value, def map) {
  if (map[map.length - 2] <= value) {
    return map[map.length - 1];
  }
  for (int i = map.length - 4; i >= 0; i -= 2) {
    if (map[i] <= value) {
      double percent = (value - map[i]) / (double)(map[i + 2] - map[i]);
      return map[i + 1] + (map[i + 3] - map[i + 1]) * percent;
    }
  }
  return map[1];
}
`;
const scoreMapper = (map) => {
  assert(Array.isArray(map) && map.length !== 0);
  return map.reduce((p, [k, v]) => p.concat(k, v), []);
};

const buildNestedQuery = (filter, ctx, target) => (filter === null
  ? { match_all: {} }
  : buildQuery(filter, ctx.allowedFields, extractPrefix(target, ctx.allowedFields)));

export default {
  random: ([target, seed, map, filter = null], ctx) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
int a = [doc[params.target].value, params.seed].hashCode();
a -= (a<<6);a ^= (a>>17);a -= (a<<9);a ^= (a<<4);
a -= (a<<3);a ^= (a<<10);a ^= (a>>15);
double result = (Math.abs(a) / (double)Integer.MAX_VALUE) - 0.5;
return remap(result, params.map);
`,
        params: {
          target,
          seed,
          map: scoreMapper(map)
        }
      }
    },
    score_mode: 'max',
    boost_mode: 'replace',
    query: buildNestedQuery(filter, ctx, target)
  }),
  '==': ([target, value, map, filter = null], ctx) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
int result = doc[params.target].contains(params.value) ? 1 : 0;
return remap(result, params.map);
`,
        params: {
          target,
          value,
          map: scoreMapper(map)
        }
      }
    },
    score_mode: 'max',
    boost_mode: 'replace',
    query: buildNestedQuery(filter, ctx, target)
  }),
  distance: ([target, location, map, filter = null], ctx) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
double result = 0;
double lat2 = params.lat;
double lon2 = params.lon;
double TO_METERS = 6371008.7714D;
double TO_RADIANS = Math.PI / 180D;
for (int i = 0; i < doc[params.target].length; i++) {
  // todo: https://github.com/elastic/elasticsearch/issues/25796
  double lat1 = doc[params.target][i].lat;
  double lon1 = doc[params.target][i].lon;
  double x1 = lat1 * TO_RADIANS;
  double x2 = lat2 * TO_RADIANS;
  double h1 = 1 - Math.cos(x1 - x2);
  double h2 = 1 - Math.cos((lon1 - lon2) * TO_RADIANS);
  double h = h1 + Math.cos(x1) * Math.cos(x2) * h2;
  double dist = TO_METERS * 2 * Math.asin(Math.min(1, Math.sqrt(h * 0.5)));
  result = Math.max(result, remap(dist, params.map));
}
return result;
`,
        params: {
          target,
          lon: location[0],
          lat: location[1],
          map: scoreMapper(map)
        }
      }
    },
    score_mode: 'max',
    boost_mode: 'replace',
    query: buildNestedQuery(filter, ctx, target)
  }),
  age: ([target, timestamp, map, filter = null], ctx) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
double result = 0;
long timestamp = Instant.parse(params.timestamp).getEpochSecond();
for (int i = 0; i < doc[params.target].length; i++) {
  long age = timestamp - doc[params.target][i].toInstant().toEpochMilli() / 1000;
  result = Math.max(result, remap(age, params.map));
}
return result;
`,
        params: {
          target,
          timestamp,
          map: scoreMapper(map)
        }
      }
    },
    score_mode: 'max',
    boost_mode: 'replace',
    query: buildNestedQuery(filter, ctx, target)
  })
};
