'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SoftphoneProvider, useSoftphone, callPeerNumber } from '@dialstack/sdk/react';
import { useWebrtcToken } from './useWebrtcToken';
import { useLookupPatient } from './useLookupPatient';
import type { Patient } from '@/app/models/patient';

// App-level softphone state. The WebRTC softphone is OFF by default and opt-in
// via `enabled`. When ON, "Call" actions across the app place the call through
// the softphone (WebRTC) via `dial()` instead of click-to-call (which rings the
// user's own device). Only when the user turns the softphone ON do we mint a
// token and mount the SDK's <SoftphoneProvider> — which owns the connection and
// stays mounted app-wide, so the call UI (the drawer) can open, close, and
// UNMOUNT without ever dropping the WebRTC session.

/** The current call's peer + matched patient, shown via the shared card. */
export interface CallMatch {
  /** The other party's number (caller for inbound, dialed number for outbound). */
  peer: string;
  patient: Patient | null;
  isLoading: boolean;
}

interface SoftphoneDrawerContextValue {
  // Softphone master switch (persistent toggle in the UI).
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  // Whether the softphone panel is open.
  open: boolean;
  setOpen: (open: boolean) => void;
  // True once a token is available for the enabled softphone.
  canDial: boolean;
  token: string | null;
  apiBaseUrl: string | null;
  // Place an outbound call through the softphone and open the drawer. No-op when
  // the softphone can't dial (off / not connected).
  dial: (destination: string) => void;
  // The current (active) call's matched patient (inbound + outbound), or null
  // when idle.
  callMatch: CallMatch | null;
  // A matched patient per RINGING inbound call, keyed by caller number — shown
  // alongside each incoming-call card (including the single-incoming case).
  incomingMatches: CallMatch[];
}

const SoftphoneDrawerContext = createContext<SoftphoneDrawerContextValue | null>(null);

export function SoftphoneDrawerProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [callMatch, setCallMatch] = useState<CallMatch | null>(null);
  // Matched patient per ringing inbound call, keyed by caller number.
  const [incomingMatches, setIncomingMatches] = useState<CallMatch[]>([]);
  const lookupPatient = useLookupPatient();

  // Whether the current foreground call is inbound — decides whether to
  // auto-close the drawer on end (inbound only; keep open after an outbound so
  // the user can place another).
  const inboundActiveRef = useRef(false);
  // Live count of the SDK's call legs, published up from inside the provider by
  // SoftphoneStateBridge. `onCallEnded` fires per-leg, so we must NOT close
  // the drawer while other calls (a held call, a second inbound) are still up —
  // only when the last leg ends.
  const callCountRef = useRef(0);

  // Only mint/connect when the softphone is enabled — useWebrtcToken no-ops on a
  // null token, so passing enabled gates the whole connection.
  const { token, apiBaseUrl, unavailable, refresh } = useWebrtcToken(enabled);
  const canDial = enabled && !!token && !unavailable;

  // Bridge to the SDK provider's placeCall(): the bridge (mounted inside
  // <SoftphoneProvider>) publishes useSoftphone().placeCall here so host
  // click-to-call buttons (which live outside that provider) can place a call.
  const softphoneDialRef = useRef<((destination: string) => void) | null>(null);

  const dial = useCallback((destination: string) => {
    if (!destination) return;
    setOpen(true);
    softphoneDialRef.current?.(destination);
  }, []);

  // Match a peer number to a patient and set the shared card. Driven by the
  // ACTIVE call's peer (via SoftphoneStateBridge), so the card always reflects
  // the call the user is on-screen with — it follows call-waiting answers,
  // held-call switches, and the auto-promotion when the active call ends. A null
  // peer (no active call) clears the card so there's no stale patient section.
  const matchPatient = useCallback(
    async (peer: string | null) => {
      if (!peer) {
        setCallMatch(null);
        return;
      }
      setCallMatch({ peer, patient: null, isLoading: true });
      const patient = await lookupPatient(peer);
      setCallMatch((cur) =>
        cur && cur.peer === peer ? { ...cur, patient, isLoading: false } : cur
      );
    },
    [lookupPatient]
  );

  // Reconcile the matched-patient list for the CURRENTLY RINGING inbound calls,
  // keyed by caller number. Called by SoftphoneStateBridge whenever the set of
  // ringing peers changes: existing matches are kept (so an in-flight/resolved
  // lookup isn't thrown away and re-fetched), peers that stopped ringing are
  // dropped, and newly-ringing peers get a lookup. Covers the single-incoming
  // case too — every ringing call shows its patient match.
  // Track which peers we've already kicked a lookup for, so a re-run (or React
  // StrictMode's double-invoke) doesn't refetch or race. Cleared entries are
  // re-lookable if the same caller rings again later.
  const incomingLookedUpRef = useRef<Set<string>>(new Set());
  const matchIncoming = useCallback(
    (peers: string[]) => {
      const peerSet = new Set(peers);
      // Drop lookup-tracking for peers that stopped ringing so a later call from
      // the same number re-looks-up.
      for (const p of incomingLookedUpRef.current) {
        if (!peerSet.has(p)) incomingLookedUpRef.current.delete(p);
      }
      // Reconcile the list: keep existing entries (match preserved), add new
      // ringing peers as loading, drop gone ones. Pure updater — no side effects.
      setIncomingMatches((cur) => {
        const byPeer = new Map(cur.map((m) => [m.peer, m]));
        return peers.map((peer) => byPeer.get(peer) ?? { peer, patient: null, isLoading: true });
      });
      // Fire a lookup for each peer we haven't looked up yet (side effects live
      // out here, not in the updater).
      for (const peer of peers) {
        if (incomingLookedUpRef.current.has(peer)) continue;
        incomingLookedUpRef.current.add(peer);
        void lookupPatient(peer).then((patient) => {
          setIncomingMatches((cur) =>
            cur.map((m) => (m.peer === peer ? { ...m, patient, isLoading: false } : m))
          );
        });
      }
    },
    [lookupPatient]
  );

  const onIncomingCall = useCallback(() => {
    inboundActiveRef.current = true;
    setOpen(true);
  }, []);

  const onCallStarted = useCallback((e: { direction: 'inbound' | 'outbound'; peer: string }) => {
    if (e.direction === 'outbound') inboundActiveRef.current = false;
  }, []);

  const onCallEnded = useCallback(() => {
    // Per-leg callback. The SDK fires this BEFORE it removes the ended leg from
    // its call list, so at this point `callCountRef` still counts the leg that's
    // ending: >1 means OTHER calls remain (a held call, a second inbound still
    // ringing) → keep the drawer. Only when this is the last leg (count <= 1) do
    // we auto-close an inbound drawer. The matched-patient card is NOT cleared
    // here — SoftphoneStateBridge clears it when the active call goes null.
    if (callCountRef.current > 1) return;
    if (inboundActiveRef.current) {
      inboundActiveRef.current = false;
      setOpen(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      open,
      setOpen,
      canDial,
      token,
      apiBaseUrl,
      dial,
      callMatch,
      incomingMatches,
    }),
    [enabled, open, canDial, token, apiBaseUrl, dial, callMatch, incomingMatches]
  );

  return (
    <SoftphoneDrawerContext.Provider value={value}>
      {/*
        ALWAYS render <SoftphoneProvider> so {children} keeps the same tree
        position whether the softphone is on or off. The SDK connects only once
        it has a non-empty token (it renders idle until then), so an empty token
        while disabled means no connection — but the provider (and the whole
        dashboard subtree under it) never mounts/unmounts on the `enabled` toggle
        or on token arrival. Gating this on `enabled` (or `enabled && token`)
        would reparent the entire dashboard when the user flips the toggle or the
        token lands, losing component state (open forms, scroll, in-progress
        edits). The token gate lives entirely inside useWebrtcToken.
      */}
      <SoftphoneProvider
        token={enabled ? (token ?? '') : ''}
        apiBaseUrl={apiBaseUrl ?? undefined}
        onTokenExpiring={refresh}
        onIncomingCall={onIncomingCall}
        onCallStarted={onCallStarted}
        onCallEnded={onCallEnded}
      >
        <SoftphoneDialBridge dialRef={softphoneDialRef} />
        <SoftphoneStateBridge
          countRef={callCountRef}
          onActivePeer={matchPatient}
          onIncomingPeers={matchIncoming}
        />
        {children}
      </SoftphoneProvider>
    </SoftphoneDrawerContext.Provider>
  );
}

// Publishes the SDK softphone's placeCall() into the host ref so click-to-call
// from anywhere in the app routes through the (single, always-connected)
// softphone. Renders nothing; must live inside <SoftphoneProvider>.
function SoftphoneDialBridge({
  dialRef,
}: {
  dialRef: React.RefObject<((destination: string) => void) | null>;
}) {
  const { placeCall } = useSoftphone();
  useEffect(() => {
    dialRef.current = (destination: string) => void placeCall(destination);
    return () => {
      dialRef.current = null;
    };
  }, [placeCall, dialRef]);
  return null;
}

// Bridges SDK softphone state up to the drawer provider. Three jobs:
//  - Publish the live call-leg count so the per-leg onCallEnded can tell whether
//    OTHER calls remain before closing the drawer.
//  - Drive the ACTIVE call's matched-patient card off its peer, so the card
//    always tracks the on-screen call (call-waiting answer, held-call switch,
//    auto-promotion on end) and clears when there's no active call.
//  - Drive the per-INCOMING-call matches off the ringing peers, so every ringing
//    inbound call (one or many) shows its patient match.
// Renders nothing; must live inside <SoftphoneProvider>.
function SoftphoneStateBridge({
  countRef,
  onActivePeer,
  onIncomingPeers,
}: {
  countRef: React.RefObject<number>;
  onActivePeer: (peer: string | null) => void;
  onIncomingPeers: (peers: string[]) => void;
}) {
  const { calls, activeCall, incomingCalls } = useSoftphone();
  useEffect(() => {
    countRef.current = calls.length;
  }, [calls.length, countRef]);

  // Re-match only when the active peer changes (not on every render tick from
  // duration/hold state). A null active call clears the card.
  const activePeer = activeCall ? callPeerNumber(activeCall) : null;
  useEffect(() => {
    onActivePeer(activePeer);
  }, [activePeer, onActivePeer]);

  // Re-match the ringing inbound set whenever its peers change. Keyed on a stable
  // string of the peers so answering/declining one (or a new one ringing) updates
  // the matches, but unrelated re-renders don't.
  const incomingPeersKey = incomingCalls.map(callPeerNumber).join('|');
  useEffect(() => {
    onIncomingPeers(incomingPeersKey ? incomingPeersKey.split('|') : []);
  }, [incomingPeersKey, onIncomingPeers]);
  return null;
}

export function useSoftphoneDrawer(): SoftphoneDrawerContextValue {
  const ctx = useContext(SoftphoneDrawerContext);
  if (!ctx) throw new Error('useSoftphoneDrawer must be used within a SoftphoneDrawerProvider');
  return ctx;
}
