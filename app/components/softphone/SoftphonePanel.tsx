'use client';

import { Softphone } from '@dialstack/sdk/react';
import { CallSheet } from '@/app/components/call/CallSheet';
import { CallSheetHeader } from '@/app/components/call/CallSheetHeader';
import { PatientCallCard } from '@/app/components/screen-pop/PatientCallCard';
import { useSoftphoneDrawer } from '@/app/hooks/SoftphoneDrawerProvider';

// The softphone drawer. A pure VIEW of the softphone state: the WebRTC connection
// lives in <SoftphoneProvider> (mounted app-wide in SoftphoneDrawerProvider), so this
// drawer reuses the shared CallSheet chrome (same as ScreenPopPanel) and UNMOUNTS
// on close — closing it no longer drops the phone.
//
// The SDK <Softphone> owns the dial pad / incoming / in-call UI and its built-in
// E911 prompt; spineline adds the matched-patient card below it.
export function SoftphonePanel() {
  const { enabled, open, setOpen, callMatch, incomingMatches } = useSoftphoneDrawer();

  // Softphone off → nothing (SoftphoneDrawerProvider also skips the connection).
  if (!enabled) return null;

  // During an ONGOING (answered) call, show ONLY the active call's patient match —
  // even if another call is ringing (call-waiting). The incoming patient cards
  // are for the idle/ringing state (no call answered yet); once on a call, the
  // user's focus is the active party. `callMatch` is set exactly when there's an
  // active call, so it's the gate.
  const inOngoingCall = callMatch !== null;

  // With two or more calls ringing at once (and no active call), cap each incoming
  // patient card's height and let its content scroll so the SDK incoming cards
  // (which always render in full above) stay visible and the drawer doesn't
  // overflow. A single incoming call shows its patient info unbounded.
  const boundIncoming = incomingMatches.length >= 2;

  return (
    <CallSheet
      open={open}
      onOpenChange={setOpen}
      title="Softphone"
      description="Browser softphone"
      header={<CallSheetHeader title="Softphone" />}
    >
      <div className="flex flex-col gap-5">
        {/* The SDK softphone (dial pad / incoming / in-call + E911). The incoming
            answer/decline cards render here in full. */}
        <Softphone autoFocusDestination />

        {inOngoingCall ? (
          /* On an active call → the active call's patient match only. */
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <PatientCallCard
              fromNumber={callMatch.peer}
              patient={callMatch.patient}
              isLoading={callMatch.isLoading}
              showCallerNumber={false}
              // Deliberately keep the drawer OPEN after "View Patient" (unlike the
              // screen pop, which dismisses): the softphone is the persistent call
              // surface — the user stays on the call and can place the next one
              // without reopening it. Navigation happens in a new context.
              onAction={() => setOpen(true)}
            />
          </div>
        ) : (
          /* Idle with ringing inbound call(s) → one patient card per ringing call
             (shown for a single incoming too), bounded+scrollable when 2+ ring. */
          incomingMatches.map((match) => (
            <div
              key={match.peer}
              className="rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className={boundIncoming ? 'max-h-64 overflow-y-auto p-4' : 'p-4'}>
                <PatientCallCard
                  fromNumber={match.peer}
                  patient={match.patient}
                  isLoading={match.isLoading}
                  showCallerNumber={false}
                  onAction={() => setOpen(true)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </CallSheet>
  );
}
