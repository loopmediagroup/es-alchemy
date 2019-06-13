const assert = require('assert');

const remap = `
double remap(def value, def map) {
  for (int i = map.length - 2; i >= 0; i -= 2) {
    if (map[i] <= value) {
      return map[i + 1];
    }
  }
  return value;
}
`;
const scoreMapper = (map = []) => {
  assert(Array.isArray(map));
  return map.reduce((p, [k, v]) => p.concat(k, v), []);
};

module.exports = {
  random: (target, seed, map) => ({
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
    }
  }),
  '==': (target, value, map) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
int result = doc[params.target].values.contains(params.value) ? 1 : 0;
return remap(result, params.map);
`,
        params: {
          target,
          value,
          map: scoreMapper(map)
        }
      }
    }
  }),
  distance: (target, location, map) => ({
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
for (int i = 0; i < doc[params.target].values.length; i++) {
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
    }
  }),
  age: (target, timestamp, map) => ({
    script_score: {
      script: {
        lang: 'painless',
        inline: `
${remap}
double result = -Double.MAX_VALUE;
long timestamp = Instant.parse(params.timestamp).getEpochSecond();
for (int i = 0; i < doc[params.target].values.length; i++) {
  long age = timestamp - doc[params.target][i].getMillis() / 1000;
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
    }
  })
};
