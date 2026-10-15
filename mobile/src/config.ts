import Constants from 'expo-constants';

import { clearTokens, getSessionToken, getSpinelineToken, setSessionToken } from './storage';

type Extra = {
  dialstackApiBaseUrl?: string;
  spinelineUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_DIALSTACK_API_BASE_URL ??
  extra.dialstackApiBaseUrl ??
  'https://api.dialstack.ai';

/** The Spineline backend: signs the user in and mints their DialStack token. */
export const SPINELINE_URL = (
  process.env.EXPO_PUBLIC_SPINELINE_URL ??
  extra.spinelineUrl ??
  ''
).replace(/\/$/, '');

/** The push harness (scripts/wake-webhook-server.mjs) the app registers its device with. */
export const WAKE_REGISTRY_URL = process.env.EXPO_PUBLIC_WAKE_REGISTRY_URL ?? '';

/**
 * The user session token (`client_secret` from POST /v1/user_sessions), or ''
 * before the first sign-in.
 *
 * A function, not a constant: a module-level constant captures whatever was on
 * disk at first import, and the wake path can import it before a fresher token
 * is written. An expired one is returned as '' so the phone mints before it
 * connects instead of authenticating with a dead token.
 */
export function sessionToken(): string {
  const stored = getSessionToken();
  return stored && !isExpired(stored) ? stored : '';
}

// Treats an unparseable token as NOT expired: the server is the authority, and
// guessing "expired" would discard a token that might work.
function isExpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const json = decodeBase64Url(part);
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

// Pure-JS base64url decode: `globalThis.atob` is absent/unreliable on Hermes
// (it threw, so isExpired's catch treated an EXPIRED stored token as valid) and
// `Buffer` isn't shipped by RN.
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64Url(seg: string): string {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const ch of b64) {
    const v = B64_ALPHABET.indexOf(ch);
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
}

/**
 * Mints a fresh client_secret from Spineline, authenticated as the signed-in
 * practice. The phone's `onTokenExpiring`: it runs before connecting, before
 * every reconnect and ahead of expiry, including in a push-woken process with no
 * UI — which is why the Spineline token is read from disk, not from React state.
 */
export async function refreshSessionToken(): Promise<string> {
  const spinelineToken = getSpinelineToken();
  if (!SPINELINE_URL || !spinelineToken) {
    throw new Error('not signed in to Spineline (or EXPO_PUBLIC_SPINELINE_URL unset)');
  }
  const res = await fetch(`${SPINELINE_URL}/api/dialstack/webrtc-session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${spinelineToken}` },
  });
  if (res.status === 401) clearTokens();
  if (!res.ok) throw new Error(`token refresh failed: HTTP ${res.status}`);
  const { client_secret } = (await res.json()) as { client_secret?: string };
  if (!client_secret) throw new Error('token refresh: no client_secret in response');
  setSessionToken(client_secret);
  return client_secret;
}
