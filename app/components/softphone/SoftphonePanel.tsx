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
  const { enabled, open, setOpen, callMatch } = useSoftphoneDrawer();

  // Softphone off → nothing (SoftphoneDrawerProvider also skips the connection).
  if (!enabled) return null;

  return (
    <CallSheet
      open={open}
      onOpenChange={setOpen}
      title="Softphone"
      description="Browser softphone"
      header={<CallSheetHeader title="Softphone" />}
    >
      <div className="flex flex-col gap-5">
        {/* The SDK softphone (dial pad / incoming / in-call + E911). */}
        <Softphone autoFocusDestination />

        {/* Matched patient (inbound + outbound). ScreenPop is suppressed while
            the softphone is on, so this is the only patient surface. */}
        {callMatch && (
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
        )}
      </div>
    </CallSheet>
  );
}
