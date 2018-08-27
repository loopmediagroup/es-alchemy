const get = require("lodash.get");
const request = require("request-promise-native");
const mappingCreate = require("./mapping/create");
const mappingDelete = require("./mapping/delete");
const mappingGet = require("./mapping/get");
const mappingRecreate = require("./mapping/recreate");
const dataCount = require("./data/count");
const dataQuery = require("./data/query");
const dataRefresh = require("./data/refresh");
const dataUpdate = require("./data/update");


module.exports = (getMapping, options) => {
  const call = (method, idx, {
    endpoint = "",
    body = {},
    headers = {},
    json = true
  } = {}) => request({
    method,
    uri: [
      `${get(options, "protocol", "http")}:/`,
      get(options, "endpoint", "elasticsearch:9200"),
      idx,
      endpoint
    ].join("/"),
    body,
    headers,
    aws: {
      key: get(options, "aws.accessKeyId"),
      secret: get(options, "aws.secretAccessKey"),
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
      get: idx => mappingGet(call, idx),
      recreate: idx => mappingRecreate(call, idx, getMapping(idx))
    },
    data: {
      count: idx => dataCount(call, idx),
      query: (idx, filter, opts = {}) => dataQuery(call, idx, filter, opts),
      refresh: idx => dataRefresh(call, idx),
      update: (idx, opts) => dataUpdate(call, idx, opts)
    }
  };
};
