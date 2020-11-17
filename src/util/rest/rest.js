const get = require('lodash.get');
const request = require('request-promise-native');
const mappingCreate = require('./mapping/create');
const mappingDelete = require('./mapping/delete');
const mappingDiverged = require('./mapping/diverged');
const mappingGet = require('./mapping/get');
const mappingList = require('./mapping/list');
const mappingPrune = require('./mapping/prune');
const mappingSync = require('./mapping/sync');
const mappingSynced = require('./mapping/synced');
const mappingRecreate = require('./mapping/recreate');
const mappingExists = require('./mapping/exists');
const aliasGet = require('./alias/get');
const aliasUpdate = require('./alias/update');
const dataCount = require('./data/count');
const dataExists = require('./data/exists');
const dataQuery = require('./data/query');
const dataRefresh = require('./data/refresh');
const dataSignature = require('./data/signature');
const dataStats = require('./data/stats');
const dataSynced = require('./data/synced');
const dataUpdate = require('./data/update');
const dataVersion = require('./data/version');

module.exports = (getRels, getMapping, versions, options) => {
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
    ].filter((e) => e !== '').join('/'),
    body,
    headers,
    aws: {
      key: get(options, 'aws.accessKeyId'),
      secret: get(options, 'aws.secretAccessKey'),
      sign_version: '4'
    },
    simple: false,
    resolveWithFullResponse: true,
    json,
    time: true
  })
    .then(async (response) => {
      if (options.responseHook !== undefined) {
        await options.responseHook({
          request: {
            headers,
            method,
            endpoint,
            index: idx,
            body
          },
          response
        });
      }
      return response;
    });

  return {
    call: (method, idx, opts = {}) => call(method, idx, opts),
    alias: {
      get: (idx) => aliasGet(call, idx),
      update: (idx) => aliasUpdate(call, idx, getMapping(idx))
    },
    mapping: {
      create: (idx) => mappingCreate(call, idx, getMapping(idx)),
      delete: (idx) => mappingDelete(call, idx),
      diverged: (idx, cursor) => mappingDiverged(call, versions, getMapping(idx), idx, cursor),
      exists: (idx) => mappingExists(call, idx, getMapping(idx)),
      get: (idx) => mappingGet(call, idx, getMapping(idx)),
      list: () => mappingList(call),
      prune: (idx) => mappingPrune(call, versions, idx),
      sync: (idx) => mappingSync(call, versions, idx),
      synced: (idx) => mappingSynced(call, versions, idx),
      recreate: (idx) => mappingRecreate(call, idx, getMapping(idx))
    },
    data: {
      count: (idx) => dataCount(call, idx),
      exists: (idx, id) => dataExists(call, idx, id),
      query: (idx, filter) => dataQuery(call, idx, getRels(idx), getMapping(idx), filter),
      refresh: (idx) => dataRefresh(call, idx),
      signature: (idx, id) => dataSignature(call, idx, getMapping(idx), id),
      stats: () => dataStats(call),
      synced: (idx) => dataSynced(call, idx),
      update: (idx, opts) => dataUpdate(call, idx, versions.get(idx), opts),
      version: (idx, id) => dataVersion(call, idx, getMapping(idx), id)
    }
  };
};
