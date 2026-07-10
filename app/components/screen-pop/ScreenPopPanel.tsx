'use client';

import { CallSheet } from '@/app/components/call/CallSheet';
import { CallSheetHeader } from '@/app/components/call/CallSheetHeader';
import { PatientCallCard } from './PatientCallCard';
import type { IncomingCallWithPatient } from '@/app/hooks/useCallEvents';

interface ScreenPopPanelProps {
  /** Current incoming call data (null when no call) */
  call: IncomingCallWithPatient | null;
  /** Called when the panel should be dismissed */
  onDismiss: () => void;
}

/**
 * Screen pop panel that slides in from the right when a call arrives (used when
 * the softphone is OFF). Reuses the shared CallSheet chrome + CallSheetHeader —
 * the same drawer the softphone renders — and the shared PatientCallCard, so the
 * two call surfaces look identical.
 */
export function ScreenPopPanel({ call, onDismiss }: ScreenPopPanelProps) {
  return (
    <CallSheet
      open={call !== null}
      onOpenChange={(open) => !open && onDismiss()}
      title="Incoming Call"
      description={call?.call.from_name || 'Incoming call'}
      header={<CallSheetHeader title="Incoming Call" subtitle={call?.call.from_name} pulse />}
      pulse
    >
      {call && (
        <PatientCallCard
          fromNumber={call.call.from_number}
          patient={call.patient}
          isLoading={call.isLoading}
          onAction={onDismiss}
        />
      )}
    </CallSheet>
  );
}
