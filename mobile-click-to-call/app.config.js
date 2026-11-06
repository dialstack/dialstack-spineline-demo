// The cleartext-for-the-local-rig config plugin comes from the SDK's
// click-to-call example, found the same way as in metro.config.js.
const fs = require('fs');
const Module = require('module');
const path = require('path');

// The plugin files sit outside this app, where there is no node_modules (the
// SDK checkout isn't installed). Let their `require('expo/config-plugins')`
// fall back to this app's packages.
process.env.NODE_PATH = path.join(__dirname, 'node_modules');
Module._initPaths();

const example = [
  path.resolve(__dirname, '../../sdk/examples/mobile/click-to-call'),
  path.resolve(__dirname, '../../dialstack-sdk/examples/mobile/click-to-call'),
].find((dir) => fs.existsSync(dir));
if (!example) throw new Error('Clone dialstack-sdk next to this repo: see the README.');

module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, path.join(example, 'plugins/withLocalRigCleartext')],
});
