const get = require('lodash.get');
const axios = require('axios');
const { aws4Interceptor } = require('aws4-axios');
const mappingApplied = require('./mapping/applied');
const mappingApply = require('./mapping/apply');
const mappingCreate = require('./mapping/create');
const mappingDelete = require('./mapping/delete');
const mappingDiverged = require('./mapping/diverged');
const mappingGet = require('./mapping/get');
const mappingList = require('./mapping/list');
const mappingPrune = require('./mapping/prune');
const mappingPruned = require('./mapping/pruned');
const mappingRecreate = require('./mapping/recreate');
const mappingExists = require('./mapping/exists');
const aliasGet = require('./alias/get');
const aliasUpdate = require('./alias/update');
const aliasUpdated = require('./alias/updated');
const dataCount = require('./data/count');
const dataExists = require('./data/exists');
const dataQuery = require('./data/query');
const dataRefresh = require('./data/refresh');
const dataSignature = require('./data/signature');
const dataStats = require('./data/stats');
const dataSynced = require('./data/synced');
const dataUniques = require('./data/uniques');
const dataUpdate = require('./data/update');
const dataVersion = require('./data/version');

module.exports = (getFields, getRels, getMapping, getSpecs, models, versions, options) => {
  const region = get(options, 'aws.region');
  const sessionToken = get(options, 'aws.sessionToken');
  const accessKeyId = get(options, 'aws.accessKeyId');
  const secretAccessKey = get(options, 'aws.secretAccessKey');
  const interceptor = [accessKeyId, secretAccessKey].includes(undefined)
    ? undefined
    : aws4Interceptor({ region, service: 'execute-api' }, { accessKeyId, secretAccessKey });
  const call = async (method, idx, {
    endpoint = '',
    body = {},
    headers = {},
    json = true
  } = {}) => {
    const interceptorId = axios.interceptors.request.use(interceptor);
    try {
      const r = await axios({
        method,
        transformRequest: [(d, _) => (json === true ? JSON.stringify(d) : d)],
        ...(json === true ? { responseType: 'json' } : {}),
        url: [
          `${get(options, 'protocol', 'http')}:/`,
          get(options, 'endpoint', 'elasticsearch:9200'),
          idx.replace(/@/g, '%40').replace(/,/g, '%2C'),
          endpoint
        ].filter((e) => e !== '').join('/'),
        data: body,
        headers: {
          'user-agent': 'es-alchemy/0.0.1',
          ...(json === true ? { 'content-type': 'application/json' } : {}),
          accept: 'application/json',
          ...(typeof sessionToken === 'string' ? { 'x-amz-security-token': sessionToken } : {}),
          ...headers
        }
      });

      if (options.responseHook !== undefined) {
        await options.responseHook({
          request: {
            headers,
            method,
            endpoint,
            index: idx,
            body
          },
          response: {
            statusCode: r.status,
            body: r.data,
            headers: r.headers,
            // todo: fill these in
            timings: {}
          }
        });
      }
      return {
        statusCode: r.status,
        body: r.data
      };
    } catch (e) {
      return {
        statusCode: e.response.status,
        body: e.response.data
      };
    } finally {
      axios.interceptors.request.eject(interceptorId);
    }
  };

  return {
    call: (method, idx, opts = {}) => call(method, idx, opts),
    alias: {
      get: (idx) => aliasGet(call, idx),
      update: (idx) => aliasUpdate(call, idx, getMapping(idx)),
      updated: (idx) => aliasUpdated(call, idx, getMapping(idx))
    },
    mapping: {
      applied: (idx) => mappingApplied(call, versions, idx),
      apply: (idx) => mappingApply(call, versions, idx),
      create: (idx) => mappingCreate(call, idx, getMapping(idx)),
      delete: (idx) => mappingDelete(call, idx),
      diverged: (idx, cursor) => mappingDiverged(call, versions, getMapping(idx), idx, cursor),
      exists: (idx) => mappingExists(call, idx, getMapping(idx)),
      get: (idx) => mappingGet(call, idx, getMapping(idx)),
      list: () => mappingList(call),
      prune: (idx) => mappingPrune(call, versions, idx),
      pruned: (idx) => mappingPruned(call, versions, idx),
      recreate: (idx) => mappingRecreate(call, idx, getMapping(idx))
    },
    data: {
      count: (idx, filter) => dataCount(call, idx, filter),
      exists: (idx, id) => dataExists(call, idx, id),
      query: (idx, filter) => dataQuery(call, idx, getRels(idx), getSpecs(idx), models, filter),
      refresh: (idx) => dataRefresh(call, idx),
      signature: (idx, id) => dataSignature(call, idx, getMapping(idx), id),
      stats: () => dataStats(call),
      synced: (idx) => dataSynced(call, versions, idx),
      uniques: (idx, field, opts = {}) => dataUniques(call, idx, getFields(idx), field, opts),
      update: (opts) => dataUpdate(call, versions, opts),
      version: (idx, id) => dataVersion(call, idx, getMapping(idx), id)
    }
  };
};
