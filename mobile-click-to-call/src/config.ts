/** The Spineline backend: sign-in, patients, appointments, and the practice's DialStack user. */
export const SPINELINE_URL = (process.env.EXPO_PUBLIC_SPINELINE_URL ?? '').replace(/\/$/, '');

/**
 * The click-to-call rig (sdk/examples/mobile/click-to-call/scripts/c2c-server.mjs),
 * standing in for the backend half that holds the DialStack secret key.
 */
export const RIG_URL = (process.env.EXPO_PUBLIC_RIG_URL ?? 'http://10.0.2.2:8788').replace(
  /\/$/,
  ''
);
