// The wake, CallKit icon and cleartext config plugins come from the SDK's
// os-integration example, found the same way as in metro.config.js.
const fs = require('fs');
const Module = require('module');
const path = require('path');

// The plugin files sit outside this app, where there is no node_modules (the
// SDK checkout isn't installed). Let their `require('expo/config-plugins')`
// fall back to this app's packages.
process.env.NODE_PATH = path.join(__dirname, 'node_modules');
Module._initPaths();

const osIntegration = [
  path.resolve(__dirname, '../../sdk/examples/mobile/os-integration'),
  path.resolve(__dirname, '../../dialstack-sdk/examples/mobile/os-integration'),
].find((dir) => fs.existsSync(dir));
if (!osIntegration) throw new Error('Clone dialstack-sdk next to this repo: see the README.');

const shared = ['withWakeHeadlessService', 'withLocalRigCleartext', 'withCallKitIcon'];

// In the order they had in app.json: before this app's own branded-call plugin.
module.exports = ({ config }) => {
  const own = config.plugins.indexOf('./plugins/withBrandedIncomingCall');
  const plugins = [...config.plugins];
  plugins.splice(own, 0, ...shared.map((name) => path.join(osIntegration, 'plugins', name)));
  return { ...config, plugins };
};
