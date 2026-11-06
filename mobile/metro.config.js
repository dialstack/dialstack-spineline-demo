// The OS layer (CallKit/Telecom adapter, call bridge, permissions, background
// timers) is imported from the SDK's os-integration example rather than copied:
// from the monorepo, or from a dialstack-sdk clone next to this repo. Its files
// import their config and storage as `@/…`, which resolves to this app's own.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const osIntegration = [
  path.resolve(__dirname, '../../sdk/examples/mobile/os-integration'),
  path.resolve(__dirname, '../../dialstack-sdk/examples/mobile/os-integration'),
].find((dir) => fs.existsSync(dir));
if (!osIntegration) throw new Error('Clone dialstack-sdk next to this repo: see the README.');

// tsconfig's paths are for TypeScript only (they also point the imported files'
// package types at this app), so the bundle's aliases are declared here.
const aliases = {
  '@/assets/': path.join(__dirname, 'assets/'),
  '@/': path.join(__dirname, 'src/'),
  '@os/': path.join(osIntegration, 'src/'),
};

config.watchFolders = [osIntegration];
// Every package resolves from this app, wherever the importing file sits, so
// there is one React and one copy of each native module's JS.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.resolveRequest = (context, name, platform) => {
  const prefix = Object.keys(aliases).find((p) => name.startsWith(p));
  const target = prefix ? aliases[prefix] + name.slice(prefix.length) : name;
  return context.resolveRequest(context, target, platform);
};

module.exports = config;
