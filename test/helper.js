const path = require('path');
const Index = require('../src/index');

const models = Index.loadJsonInDir(path.join(__dirname, 'models'));
const indices = Index.loadJsonInDir(path.join(__dirname, 'indices'));
const mappings = Index.loadJsonInDir(path.join(__dirname, 'mappings'));
const fields = Index.loadJsonInDir(path.join(__dirname, 'fields'));
const rels = Index.loadJsonInDir(path.join(__dirname, 'rels'));
const remaps = Index.loadJsonInDir(path.join(__dirname, 'remaps'));
const query = Index.loadJsonInDir(path.join(__dirname, 'query'));
const queryMappings = Index.loadJsonInDir(path.join(__dirname, 'query', 'mappings'));

const registerEntitiesForIndex = (index) => {
  Object.entries(models).forEach(([name, specs]) => {
    index.model.register(name, specs);
  });
  Object.entries(indices).forEach(([name, specs]) => {
    index.index.register(name, specs);
  });
};

module.exports = {
  models,
  indices,
  mappings,
  fields,
  rels,
  remaps,
  query,
  queryMappings,
  registerEntitiesForIndex
};
