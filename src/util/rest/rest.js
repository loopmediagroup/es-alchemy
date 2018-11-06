const get = require('lodash.get');
const request = require('request-promise-native');
const mappingCreate = require('./mapping/create');
const mappingDelete = require('./mapping/delete');
const mappingGet = require('./mapping/get');
const mappingList = require('./mapping/list');
const mappingHistoric = require('./mapping/historic');
const mappingRecreate = require('./mapping/recreate');
const dataCount = require('./data/count');
const dataQuery = require('./data/query');
const dataRefresh = require('./data/refresh');
const dataHistoric = require('./data/historic');
const dataUpdate = require('./data/update');


module.exports = (listIndices, getMapping, options) => {
  const call = (method, idx, {
    endpoint = '',
    body = {},
    headers = {},
    json = true
  } = {}) => request({
    method,
    uri: [
      `${get(options, 'protocol', 'http')}:/`,
      get(options, 'endpoint', 'elasticsearch:9200'),
      idx.replace(/@/g, '%40').replace(/,/g, '%2C'),
      endpoint
    ].filter(e => e !== '').join('/'),
    body,
    headers,
    aws: {
      key: get(options, 'aws.accessKeyId'),
      secret: get(options, 'aws.secretAccessKey'),
      sign_version: '4'
    },
    simple: false,
    resolveWithFullResponse: true,
    json
  });

  return {
    call: (method, idx, opts = {}) => call(method, idx, opts),
    mapping: {
      create: idx => mappingCreate(call, idx, getMapping(idx)),
      delete: idx => mappingDelete(call, idx),
      get: idx => mappingGet(call, idx, getMapping(idx)),
      list: () => mappingList(call),
      historic: idx => mappingHistoric(call, idx, getMapping(idx)),
      recreate: idx => mappingRecreate(call, idx, getMapping(idx))
    },
    data: {
      count: idx => dataCount(call, idx),
      query: (idx, filter, opts = {}) => dataQuery(call, idx, getMapping(idx), filter, opts),
      refresh: idx => dataRefresh(call, idx),
      historic: (limit = 100) => dataHistoric(call, limit, () => listIndices()
        .reduce((p, idx) => Object.assign(p, { [idx]: getMapping(idx) }), {})),
      update: (idx, opts) => dataUpdate(call, idx, getMapping(idx), opts)
    }
  };
};
