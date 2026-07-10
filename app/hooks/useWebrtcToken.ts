'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Mints, holds, and refreshes a WebRTC user-session token for the embedded
// <Softphone>.
//
// Hits /api/dialstack/webrtc-session, which resolves the practice's user by the
// session email and mints a user session. If the account has no user, that route
// returns 409 — we surface that as `unavailable`, and the caller must not render
// any softphone touchpoints (no user = no calling). The token is re-minted
// before its expires_at so a long-lived tab never loses the session.
export interface WebrtcToken {
  token: string | null;
  // API base the Softphone must target. The SDK defaults to production, so we MUST
  // pass the dev URL explicitly or its ICE-server fetch hits prod and 401s.
  apiBaseUrl: string | null;
  loading: boolean;
  // True when the account has no callable user (409) — hide the softphone entirely.
  unavailable: boolean;
}

// `enabled` gates the mint: when false (softphone off) no token is fetched and
// no WebRTC connection is created — keeping the browser phone off by default.
// Re-mint this long before the token's expires_at so the WebRTC session never
// lapses mid-use (the SDK reconnects when the token changes).
const REFRESH_SKEW_MS = 60_000;

export function useWebrtcToken(enabled: boolean = true): WebrtcToken {
  const [token, setToken] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  // Set to the token's expiry (ms epoch) so a timer can re-mint before it lapses.
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Generation counter guarding against a stale in-flight mint(). Disabling the
  // softphone (or a re-mint superseding an earlier one) bumps this; a mint that
  // resolves after its generation is superseded must NOT apply its result — else
  // a fetch from the prior `enabled` window resolves late and reinstates a token
  // + re-mint timer while the softphone is supposed to be torn down.
  const mintGenRef = useRef(0);

  const mint = useCallback(async () => {
    const gen = ++mintGenRef.current;
    const isStale = () => gen !== mintGenRef.current;
    try {
      // Resolve the API base the same way the other SDK components do.
      const config = await fetch('/api/dialstack/config').then((r) => r.json());
      if (isStale()) return;
      setApiBaseUrl(config.apiUrl ?? null);

      const res = await fetch('/api/dialstack/webrtc-session', { method: 'POST' });
      if (isStale()) return;
      if (res.status === 409) {
        // No user provisioned — the softphone cannot exist for this account.
        setUnavailable(true);
        setToken(null);
        return;
      }
      if (!res.ok) {
        setToken(null);
        return;
      }
      const { client_secret: clientSecret, expires_at: tokenExpiresAt } = await res.json();
      if (isStale()) return;
      setToken(clientSecret ?? null);
      setExpiresAt(tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : null);
    } catch {
      if (!isStale()) setToken(null);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

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
      setExpiresAt(null);
      return;
    }
    setLoading(true);
    void mint();
  }, [enabled, mint]);

  // Re-mint shortly before the current token expires so the persistent softphone
  // session doesn't silently die (incoming calls stop ringing) on long-lived tabs.
  useEffect(() => {
    if (!enabled || expiresAt === null) return;
    const delay = Math.max(0, expiresAt - Date.now() - REFRESH_SKEW_MS);
    const timer = setTimeout(() => void mint(), delay);
    return () => clearTimeout(timer);
  }, [enabled, expiresAt, mint]);

  return { token, apiBaseUrl, loading, unavailable };
}
