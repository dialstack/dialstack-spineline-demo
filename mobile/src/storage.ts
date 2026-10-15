import { createMMKV } from 'react-native-mmkv';
import type { PlatformStorage } from '@dialstack/sdk-native';

/**
 * MMKV rather than AsyncStorage because it is SYNCHRONOUS: `PlatformStorage` is
 * a synchronous interface, and a wake push can start this process with no UI, so
 * the wake path must read without an async warm-up (AsyncStorage's pre-hydration
 * read silently returned null).
 *
 * NOT encrypted — plain text on disk behind the app sandbox. Acceptable for the
 * E911 id, borderline for the session token (a short-lived `client_secret`, not
 * an `sk_live`); encrypting means bootstrapping a key from Keychain/Keystore.
 */
const store = createMMKV();

const SESSION_TOKEN_KEY = 'dialstack.sessionToken';
const INSTALL_ID_KEY = 'dialstack.installId';
const SPINELINE_TOKEN_KEY = 'spineline.token';

/**
 * The SDK's persistence adapter (stores only the E911 address id). `getItem`
 * returns `string | null` per `PlatformStorage`; MMKV returns `undefined` for a
 * missing key.
 */
export const storage: PlatformStorage = {
  getItem: (key) => store.getString(key) ?? null,
  setItem: (key, value) => {
    store.set(key, value);
  },
  removeItem: (key) => {
    store.remove(key);
  },
};

/**
 * Persist the session token. Must be on disk rather than in memory because a
 * wake push can start this process cold, with no UI and no login flow to run.
 */
export function setSessionToken(token: string): void {
  store.set(SESSION_TOKEN_KEY, token);
}

/** The persisted token, or null when nobody has logged in on this device. */
export function getSessionToken(): string | null {
  return store.getString(SESSION_TOKEN_KEY) ?? null;
}

/**
 * The Spineline sign-in token (from POST /api/mobile/login). On disk for the same
 * reason as the session token: a push-woken process mints its DialStack token
 * with it before any UI exists.
 */
export function getSpinelineToken(): string | null {
  return store.getString(SPINELINE_TOKEN_KEY) ?? null;
}

export function setSpinelineToken(token: string): void {
  store.set(SPINELINE_TOKEN_KEY, token);
}

const clearedListeners = new Set<() => void>();

/** Called whenever the tokens are dropped, including on a 401 from Spineline. */
export function onTokensCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}

/** Sign-out: forget both tokens. The E911 id and install id stay. */
export function clearTokens(): void {
  store.remove(SPINELINE_TOKEN_KEY);
  store.remove(SESSION_TOKEN_KEY);
  clearedListeners.forEach((l) => l());
}

/**
 * A random id for this install, minted once and kept. The push backend keys a
 * device on it rather than on the push token, which changes across updates and
 * restores, so a device can't end up registered, and pushed, twice.
 */
export function getInstallId(): string {
  const existing = store.getString(INSTALL_ID_KEY);
  if (existing) return existing;
  const id = `inst_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  store.set(INSTALL_ID_KEY, id);
  return id;
}
