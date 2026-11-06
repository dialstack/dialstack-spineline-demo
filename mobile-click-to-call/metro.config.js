// This app imports, rather than copies, what it shares with two other apps:
// sign-in and screen chrome from the in-app calling demo (`@spineline/…`), and
// the rig client, call hooks and call text from the SDK's click-to-call example
// (`@c2c/…`), found in the monorepo or in a dialstack-sdk clone next to this
// repo. Those files import their config, storage, session and theme as `@/…`,
// which resolves to this app's own.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const example = [
  path.resolve(__dirname, '../../sdk/examples/mobile/click-to-call'),
  path.resolve(__dirname, '../../dialstack-sdk/examples/mobile/click-to-call'),
].find((dir) => fs.existsSync(dir));
if (!example) throw new Error('Clone dialstack-sdk next to this repo: see the README.');
const spineline = path.resolve(__dirname, '../mobile');

// tsconfig's paths are for TypeScript only (they also point the imported files'
// package types at this app), so the bundle's aliases are declared here.
const aliases = {
  '@/assets/': path.join(__dirname, 'assets/'),
  '@/': path.join(__dirname, 'src/'),
  '@spineline/': path.join(spineline, 'src/'),
  '@c2c/': path.join(example, 'src/'),
};

config.watchFolders = [example, spineline];
// Every package resolves from this app, wherever the importing file sits, so
// there is one React.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.resolveRequest = (context, name, platform) => {
  const prefix = Object.keys(aliases).find((p) => name.startsWith(p));
  const target = prefix ? aliases[prefix] + name.slice(prefix.length) : name;
  return context.resolveRequest(context, target, platform);
};

module.exports = config;
