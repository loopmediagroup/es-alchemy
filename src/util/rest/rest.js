import get from 'lodash.get';
import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import mappingApplied from './mapping/applied.js';
import mappingApply from './mapping/apply.js';
import mappingCreate from './mapping/create.js';
import mappingDelete from './mapping/delete.js';
import mappingDiverged from './mapping/diverged.js';
import mappingGet from './mapping/get.js';
import mappingList from './mapping/list.js';
import mappingPrune from './mapping/prune.js';
import mappingPruned from './mapping/pruned.js';
import mappingRecreate from './mapping/recreate.js';
import mappingExists from './mapping/exists.js';
import aliasGet from './alias/get.js';
import aliasUpdate from './alias/update.js';
import aliasUpdated from './alias/updated.js';
import dataCount from './data/count.js';
import dataExists from './data/exists.js';
import dataQuery from './data/query.js';
import dataRefresh from './data/refresh.js';
import dataSignature from './data/signature.js';
import dataStats from './data/stats.js';
import dataSynced from './data/synced.js';
import dataUniques from './data/uniques.js';
import dataUpdate from './data/update.js';
import dataVersion from './data/version.js';

export default (getFields, getRels, getMapping, getSpecs, models, versions, options) => {
  const region = get(options, 'aws.region');
  const sessionToken = get(options, 'aws.sessionToken');
  const accessKeyId = get(options, 'aws.accessKeyId');
  const secretAccessKey = get(options, 'aws.secretAccessKey');
  const interceptor = [accessKeyId, secretAccessKey].includes(undefined)
    ? undefined
    : aws4Interceptor({ region, service: 'es' }, { accessKeyId, secretAccessKey });
  const ax = axios.create({});
  ax.defaults.headers = {};
  const call = async (method, idx, {
    endpoint = '',
    body = {},
    headers = {},
    json = true
  } = {}) => {
    const interceptorId = ax.interceptors.request.use(interceptor);
    try {
      const requestHeaders = {
        'user-agent': 'es-alchemy/0.0.1',
        ...(json === true ? { 'content-type': 'application/json' } : {}),
        accept: 'application/json',
        ...(typeof sessionToken === 'string' ? { 'x-amz-security-token': sessionToken } : {}),
        ...headers
      };
      const startTime = new Date() / 1;
      const r = await ax({
        method,
        transformRequest: [(d, h) => {
          const entries = Object.entries(h);
          entries.forEach(([k, v]) => {
            const kLower = k.toLowerCase();
            if (k !== kLower) {
              // eslint-disable-next-line no-param-reassign
              delete h[k];
              // eslint-disable-next-line no-param-reassign
              h[kLower] = v;
            }
          });
          return json === true ? JSON.stringify(d) : d;
        }],
        validateStatus: () => true,
        url: [
          `${get(options, 'protocol', 'http')}:/`,
          get(options, 'endpoint', 'opensearch:9200'),
          idx.replace(/@/g, '%40').replace(/,/g, '%2C'),
          endpoint
        ].filter((e) => e !== '').join('/'),
        data: body,
        headers: requestHeaders
      });

      const response = {
        statusCode: r.status,
        body: r.data,
        headers: r.headers,
        timings: {
          duration: (new Date() / 1) - startTime
        }
      };
      if (options.responseHook !== undefined) {
        await options.responseHook({
          request: {
            headers: requestHeaders,
            method,
            endpoint,
            index: idx,
            body
          },
          response
        });
      }
      return response;
    } finally {
      ax.interceptors.request.eject(interceptorId);
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
      update: (actions, raw = false) => dataUpdate(call, versions, actions, raw),
      version: (idx, id) => dataVersion(call, idx, getMapping(idx), id)
    }
  };
};
