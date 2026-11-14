// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // design/ guarda as telas exportadas do Claude Design (HTML + o motor que as desenha):
    // são referência visual, não código do app.
    ignores: ['dist/*', 'design/*', '.expo/*'],
  },
]);
