'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDialstackContext } from './EmbeddedComponentProvider';
import { useLookupPatient } from './useLookupPatient';
import type { IncomingCallEvent } from '@dialstack/sdk';
import type { Patient } from '@/app/models/patient';

/**
 * Incoming call with patient lookup result
 */
export interface IncomingCallWithPatient {
  /** Original call event data */
  call: IncomingCallEvent;
  /** Matched patient (null if no match found) */
  patient: Patient | null;
  /** Whether we're still looking up the patient */
  isLoading: boolean;
}

/**
 * Hook to receive real-time call events and look up caller info
 *
 * This hook:
 * 1. Subscribes to call.incoming events from DialStack
 * 2. Looks up the caller's phone number against patients
 * 3. Returns the current call with matched patient data
 */
export function useCallEvents() {
  const { dialstackInstance } = useDialstackContext();
  const [currentCall, setCurrentCall] = useState<IncomingCallWithPatient | null>(null);
  const lookupPatient = useLookupPatient();

  /**
   * Handle incoming call event
   */
  const handleIncomingCall = useCallback(
    async (event: IncomingCallEvent) => {
      // Set initial state with loading
      setCurrentCall({
        call: event,
        patient: null,
        isLoading: true,
      });

      // Look up patient
      const patient = await lookupPatient(event.from_number);

      // Apply the result only if THIS call is still current — two calls arriving
      // in quick succession would otherwise let the slower lookup from an earlier
      // call clobber the newer call's state. Guard by the caller number, matching
      // SoftphoneDrawerProvider's functional-updater pattern.
      setCurrentCall((cur) =>
        cur && cur.call.from_number === event.from_number
          ? { ...cur, patient, isLoading: false }
          : cur
      );
    },
    [lookupPatient]
  );

  /**
   * Dismiss the current call popup
   */
  const dismissCall = useCallback(() => {
    setCurrentCall(null);
  }, []);

  // Subscribe to call events when SDK is ready
  useEffect(() => {
    if (!dialstackInstance) return;

    // Subscribe to incoming calls
    dialstackInstance.on('call.incoming', handleIncomingCall);

    // Cleanup on unmount
    return () => {
      dialstackInstance.off('call.incoming', handleIncomingCall);
    };
  }, [dialstackInstance, handleIncomingCall]);

  return {
    /** Current incoming call with patient data */
    currentCall,
    /** Dismiss the current call popup */
    dismissCall,
  };
}
