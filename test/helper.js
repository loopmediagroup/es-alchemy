import fs from 'smart-fs';
import path from 'path';
import Index from '../src/index.js';

export const models = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'models'));
export const indices = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'indices'));
export const mappings = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'mappings'));
export const fields = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'fields'));
export const rels = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'rels'));
export const remaps = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'remaps'));
export const query = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'query'));
export const queryMappings = Index.loadJsonInDir(path.join(fs.dirname(import.meta.url), 'query', 'mappings'));

export const registerEntitiesForIndex = (index) => {
  Object.entries(models).forEach(([name, specs]) => {
    index.model.register(name, specs);
  });
  Object.entries(indices).forEach(([name, specs]) => {
    index.index.register(name, specs);
  });
};
