'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Mints and holds a WebRTC user-session token for the embedded <Softphone>.
//
// Hits /api/dialstack/webrtc-session, which resolves the practice's user by the
// session email and mints a user session. If the account has no user, that route
// returns 409 — we surface that as `unavailable`, and the caller must not render
// any softphone touchpoints (no user = no calling).
//
// The token is short-lived. Rather than re-mint on a timer and swap the `token`
// prop (which reconnects), we expose `refresh` for the SDK's `onTokenExpiring`
// hook: the SDK calls it ~60s before expiry, we mint a fresh session, and the SDK
// adopts the new token in-band over the live connection — no reconnect.
export interface WebrtcToken {
  token: string | null;
  // API base the Softphone must target. The SDK defaults to production, so we MUST
  // pass the dev URL explicitly or its ICE-server fetch hits prod and 401s.
  apiBaseUrl: string | null;
  loading: boolean;
  // True when the account has no callable user (409) — hide the softphone entirely.
  unavailable: boolean;
  // In-band token refresh for the SDK's onTokenExpiring hook: mints a fresh
  // session and resolves with its client_secret (rejects if it can't).
  refresh: () => Promise<string>;
}

export function useWebrtcToken(enabled: boolean = true): WebrtcToken {
  const [token, setToken] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  // Generation counter guarding against a stale in-flight initial mint. Disabling
  // the softphone bumps this; a mint that resolves after its generation is
  // superseded must NOT apply its result — else a fetch from the prior `enabled`
  // window resolves late and reinstates the token while the softphone is supposed
  // to be torn down. Only the INITIAL mint touches `token` state, so only it needs
  // this guard; `refresh` (below) never mutates state.
  const mintGenRef = useRef(0);

  // Pure fetch of a fresh session — resolves the API base and mints a user
  // session, returning its client_secret. Mutates NO React state. Throws on
  // 409 / failure so callers can react. Shared by the initial mint and refresh.
  const fetchSession = useCallback(async (): Promise<string> => {
    const config = await fetch('/api/dialstack/config').then((r) => r.json());
    setApiBaseUrl(config.apiUrl ?? null);

    const res = await fetch('/api/dialstack/webrtc-session', { method: 'POST' });
    if (res.status === 409) throw new Response409();
    if (!res.ok) throw new Error(`webrtc-session mint failed (${res.status})`);
    const { client_secret: clientSecret } = await res.json();
    if (!clientSecret) throw new Error('webrtc-session returned no client_secret');
    return clientSecret;
  }, []);

  // In-band refresh for the SDK's onTokenExpiring: mint a fresh session and hand
  // the token straight to the SDK, which adopts it over the live connection. It
  // deliberately does NOT call setToken — the `token` prop is a useCalls
  // connect-effect dependency, so mutating it would tear the socket down and
  // reconnect (the exact thing this hook exists to avoid). On failure it rejects
  // WITHOUT touching state, so the SDK keeps the still-valid connection open.
  const refresh = useCallback(() => fetchSession(), [fetchSession]);

  useEffect(() => {
    if (!enabled) {
      // Softphone turned off — invalidate any in-flight mint() so a late-resolving
      // fetch from the prior enable can't reinstate the token, then drop state so
      // the Softphone disconnects (deregistering the endpoint). This is genuine
      // external-state sync (toggle → connection), not a cascading render.
      mintGenRef.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear token to tear down the connection when disabled
      setToken(null);
      setUnavailable(false);
      setLoading(false);
      return;
    }
    const gen = ++mintGenRef.current;
    const isStale = () => gen !== mintGenRef.current;
    setLoading(true);
    // Initial mint: this one DOES set `token` to establish the first connection.
    // A 409 (no user) surfaces as `unavailable`; other failures leave no token.
    void fetchSession()
      .then((clientSecret) => {
        if (!isStale()) setToken(clientSecret);
      })
      .catch((e) => {
        if (isStale()) return;
        if (e instanceof Response409) setUnavailable(true);
        setToken(null);
      })
      .finally(() => {
        if (!isStale()) setLoading(false);
      });
  }, [enabled, fetchSession]);

  return { token, apiBaseUrl, loading, unavailable, refresh };
}

// The account has no callable user (webrtc-session returned 409). Distinct type
// so the initial mint can surface it as `unavailable` without string-matching.
class Response409 extends Error {}
