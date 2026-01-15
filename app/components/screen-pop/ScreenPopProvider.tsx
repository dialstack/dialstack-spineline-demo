'use client';

import { useCallEvents } from '@/app/hooks/useCallEvents';
import { ScreenPopPanel } from './ScreenPopPanel';

interface ScreenPopProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that wraps the app to enable screen pop functionality.
 * Subscribes to call events and renders the screen pop panel when calls arrive.
 */
export function ScreenPopProvider({ children }: ScreenPopProviderProps) {
  const { currentCall, dismissCall } = useCallEvents();

  return (
    <>
      {children}
      <ScreenPopPanel call={currentCall} onDismiss={dismissCall} />
    </>
  );
}
