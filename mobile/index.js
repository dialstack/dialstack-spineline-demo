import './src/webrtcGlobals';
import { registerWakeTask } from '@dialstack/sdk-native';
import { bridge } from './src/callBridge';
import { isSignedIn } from './src/session';

// Both entry paths run this file: the app window, and on Android the headless
// runtime the wake service starts. Each ends up with the same bridge.
registerWakeTask(bridge);
bridge.start();
// Signed out, there is nobody to mint a token for; the login screen connects.
if (isSignedIn()) {
  bridge
    .ensureConnected()
    .catch((err) => console.log(`[call] entry connect failed: ${String(err)}`));
}

require('expo-router/entry');
