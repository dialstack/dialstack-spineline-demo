const { withDangerousMod } = require('expo/config-plugins');
const path = require('node:path');
const fs = require('node:fs');

// The full-screen incoming-call screen (lock screen) is expo-callkit-telecom's
// own IncomingCallActivity. Android resolves resources app-first, so a layout and
// drawables with the library's names in the app's res/ replace its look without
// patching its code. The override keeps every view id the activity binds.
const SOURCE = 'assets/android-res';

const copyTree = (from, to) => {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyTree(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
};

const withBrandedIncomingCall = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      copyTree(
        path.join(projectRoot, SOURCE),
        path.join(platformProjectRoot, 'app', 'src', 'main', 'res')
      );
      return cfg;
    },
  ]);

module.exports = withBrandedIncomingCall;
