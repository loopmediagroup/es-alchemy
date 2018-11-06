// @flow
// eslint-disable-next-line import/no-extraneous-dependencies
const gardener = require('js-gardener');

if (require.main === module) {
  gardener({
    author: 'Loop Media Group',
    license: 'MIT',
    docker: ['lambda'],
    ci: ['circle']
  }).catch(() => process.exit(1));
}
