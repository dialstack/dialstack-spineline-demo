'use client';

import { useCallEvents } from '@/app/hooks/useCallEvents';
import { useSoftphoneDrawer } from '@/app/hooks/SoftphoneDrawerProvider';
import { ScreenPopPanel } from './ScreenPopPanel';

interface ScreenPopProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that renders the screen-pop panel when a call arrives — but only when
 * the softphone is OFF. When the softphone is on, its own incoming-call drawer
 * shows the same caller/patient info (see SoftphonePanel), so a second pop would be
 * redundant. The call-events subscription runs regardless (it's the shared SSE),
 * so toggling the softphone doesn't drop it.
 */
export function ScreenPopProvider({ children }: ScreenPopProviderProps) {
  const { currentCall, dismissCall } = useCallEvents();
  const { enabled: softphoneEnabled } = useSoftphoneDrawer();

  return (
    <>
      {children}
      {!softphoneEnabled && <ScreenPopPanel call={currentCall} onDismiss={dismissCall} />}
    </>
  );
}
