import { bridge, phone } from './callBridge';
import { WAKE_REGISTRY_URL } from './config';
import * as spineline from './spineline';
import {
  clearTokens,
  getInstallId,
  getSpinelineToken,
  onTokensCleared,
  setSpinelineToken,
} from './storage';

/**
 * Sign-in and sign-out. Module functions over storage rather than React state,
 * because the push-woken headless runtime needs the same answer to "who is
 * signed in" with no UI mounted.
 */

export const isSignedIn = () => getSpinelineToken() !== null;

// Whatever drops the tokens (sign-out or a 401), the phone then drops the
// previous practice's token. The stored tokens are already gone, so it can't
// mint another; the phone only refuses a token change while connected, and a
// 401 can land during a live call's refresh, so a live call ends first ('ended'
// fires however it ends).
onTokensCleared(() => {
  const drop = () => {
    phone.disconnect();
    phone.setToken('');
  };
  const live = phone.activeCalls;
  if (live.length === 0) return drop();
  let left = live.length;
  for (const call of live) call.on('ended', () => --left === 0 && drop());
});

export async function signIn(email: string, password: string): Promise<void> {
  setSpinelineToken(await spineline.login(email, password));
  // The phone holds no DialStack token yet, so connecting mints one through
  // onTokenExpiring (config.refreshSessionToken) as the new practice's user.
  // Wake-push registration is the signed-in layout's job, after the mic prompt.
  try {
    await spineline.ensureDialstackUser();
    await bridge.ensureConnected();
  } catch (err) {
    clearTokens();
    throw err;
  }
}

export async function signOut(): Promise<void> {
  const token = getSpinelineToken();
  // Signed out locally at once; the unregister goes out in the background with
  // the captured token, so a stopped harness or dead tunnel never holds it up.
  clearTokens();
  if (WAKE_REGISTRY_URL && token) {
    void fetch(`${WAKE_REGISTRY_URL}/devices`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: getInstallId() }),
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => console.log(`[push] unregister failed: ${String(err)}`));
  }
}
