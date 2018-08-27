[![Build Status](https://circleci.com/gh/loopmediagroup/es-alchemy.png?style=shield)](https://circleci.com/gh/loopmediagroup/es-alchemy)
[![Test Coverage](https://img.shields.io/coveralls/loopmediagroup/es-alchemy/master.svg)](https://coveralls.io/github/loopmediagroup/es-alchemy?branch=master)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=loopmediagroup/es-alchemy)](https://dependabot.com)
[![Dependencies](https://david-dm.org/loopmediagroup/es-alchemy/status.svg)](https://david-dm.org/loopmediagroup/es-alchemy)
[![NPM](https://img.shields.io/npm/v/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)
[![Downloads](https://img.shields.io/npm/dt/es-alchemy.svg)](https://www.npmjs.com/package/es-alchemy)
[![Semantic-Release](https://github.com/simlu/js-gardener/blob/master/assets/icons/semver.svg)](https://github.com/semantic-release/semantic-release)
[![Gardener](https://github.com/simlu/js-gardener/blob/master/assets/badge.svg)](https://github.com/simlu/js-gardener)

# EsAlchemy

Simplification of Elasticsearch interactions

## Install

```bash
npm i --save es-alchemy
```

## Tests

All tests need to be run in docker container. Start with:

```bash
. manage.sh
```

Test elasticsearch works correctly with

```bash
curl http://elasticsearch:9200/_cluster/health
```

Run all tests with

```bash
npm t
```

## Outline

- model format
- index format
- how to use remapping
- ...
