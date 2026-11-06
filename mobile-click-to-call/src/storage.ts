import { createMMKV } from 'react-native-mmkv';

/**
 * The Spineline sign-in and the DialStack user it maps to. Nothing here needs
 * to be read before the UI exists — this app is never woken in the background —
 * but MMKV is synchronous, so a signed-in launch goes straight to the tabs.
 */
const store = createMMKV();

const SPINELINE_TOKEN_KEY = 'spineline.token';
const DIALSTACK_USER_KEY = 'dialstack.userId';

/** The Spineline sign-in token (from POST /api/mobile/login). */
export function getSpinelineToken(): string | null {
  return store.getString(SPINELINE_TOKEN_KEY) ?? null;
}

export function setSpinelineToken(token: string): void {
  store.set(SPINELINE_TOKEN_KEY, token);
}

/** The practice's DialStack user: whose cell rings, and whose calls the rig tracks. */
export function getDialstackUserId(): string | null {
  return store.getString(DIALSTACK_USER_KEY) ?? null;
}

export function setDialstackUserId(id: string): void {
  store.set(DIALSTACK_USER_KEY, id);
}

const clearedListeners = new Set<() => void>();

/** Called whenever the sign-in is dropped, including on a 401 from Spineline. */
export function onTokensCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}

export function clearTokens(): void {
  store.remove(SPINELINE_TOKEN_KEY);
  store.remove(DIALSTACK_USER_KEY);
  clearedListeners.forEach((l) => l());
}
