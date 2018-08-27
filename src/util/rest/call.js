const get = require("lodash.get");
const call = require("request-promise-native");


module.exports = (method, idx, {
  endpoint = "",
  body = {},
  headers = {},
  json = true
} = {}) => call({
  method,
  uri: [
    `${get(process.env, "elasticSearchProtocol", "http")}:/`,
    get(process.env, "elasticSearchEndpoint", "elasticsearch:9200"),
    idx,
    endpoint
  ].join("/"),
  body,
  headers,
  aws: {
    key: process.env.elasticSearchAccessKeyId,
    secret: process.env.elasticSearchSecretAccessKey,
    sign_version: '4'
  },
  simple: false,
  resolveWithFullResponse: true,
  json
});
