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
import { SoftphoneProvider, useSoftphone } from '@dialstack/sdk/react';
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
  // The current call's matched patient (inbound + outbound), or null when idle.
  callMatch: CallMatch | null;
}

const SoftphoneDrawerContext = createContext<SoftphoneDrawerContextValue | null>(null);

export function SoftphoneDrawerProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [callMatch, setCallMatch] = useState<CallMatch | null>(null);
  const lookupPatient = useLookupPatient();

  // Whether the current foreground call is inbound — decides whether to
  // auto-close the drawer on end (inbound only; keep open after an outbound so
  // the user can place another).
  const inboundActiveRef = useRef(false);

  // Only mint/connect when the softphone is enabled — useWebrtcToken no-ops on a
  // null token, so passing enabled gates the whole connection.
  const { token, apiBaseUrl, unavailable } = useWebrtcToken(enabled);
  const canDial = enabled && !!token && !unavailable;

  // Bridge to the SDK provider's dial(): the bridge (mounted inside
  // <SoftphoneProvider>) publishes useSoftphone().dial here so host click-to-call
  // buttons (which live outside that provider) can place a call.
  const softphoneDialRef = useRef<((destination: string) => void) | null>(null);

  const dial = useCallback((destination: string) => {
    if (!destination) return;
    setOpen(true);
    softphoneDialRef.current?.(destination);
  }, []);

  // Match a call's peer number to a patient and set/update the shared card.
  const matchPatient = useCallback(
    async (peer: string) => {
      setCallMatch({ peer, patient: null, isLoading: true });
      const patient = await lookupPatient(peer);
      setCallMatch((cur) =>
        cur && cur.peer === peer ? { ...cur, patient, isLoading: false } : cur
      );
    },
    [lookupPatient]
  );

  const onIncomingCall = useCallback(
    (e: { from: string; fromName: string | null }) => {
      inboundActiveRef.current = true;
      setOpen(true);
      void matchPatient(e.from);
    },
    [matchPatient]
  );

  const onCallStarted = useCallback(
    (e: { direction: 'inbound' | 'outbound'; peer: string }) => {
      if (e.direction === 'outbound') {
        inboundActiveRef.current = false;
        void matchPatient(e.peer);
      }
    },
    [matchPatient]
  );

  const onCallEnded = useCallback(() => {
    setCallMatch(null);
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
    }),
    [enabled, open, canDial, token, apiBaseUrl, dial, callMatch]
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
        onIncomingCall={onIncomingCall}
        onCallStarted={onCallStarted}
        onCallEnded={onCallEnded}
      >
        <SoftphoneDialBridge dialRef={softphoneDialRef} />
        {children}
      </SoftphoneProvider>
    </SoftphoneDrawerContext.Provider>
  );
}

// Publishes the SDK softphone's dial() into the host ref so click-to-call from
// anywhere in the app routes through the (single, always-connected) softphone.
// Renders nothing; must live inside <SoftphoneProvider>.
function SoftphoneDialBridge({
  dialRef,
}: {
  dialRef: React.RefObject<((destination: string) => void) | null>;
}) {
  const { dial } = useSoftphone();
  useEffect(() => {
    dialRef.current = dial;
    return () => {
      dialRef.current = null;
    };
  }, [dial, dialRef]);
  return null;
}

export function useSoftphoneDrawer(): SoftphoneDrawerContextValue {
  const ctx = useContext(SoftphoneDrawerContext);
  if (!ctx) throw new Error('useSoftphoneDrawer must be used within a SoftphoneDrawerProvider');
  return ctx;
}
