'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDialstackContext } from './EmbeddedComponentProvider';
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

  /**
   * Look up patient by phone number
   */
  const lookupPatient = useCallback(async (phone: string): Promise<Patient | null> => {
    try {
      const response = await fetch(`/api/patients/lookup?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        console.error('Failed to lookup patient:', response.statusText);
        return null;
      }
      const { patient } = await response.json();
      return patient;
    } catch (error) {
      console.error('Error looking up patient:', error);
      return null;
    }
  }, []);

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

      // Update with patient result
      setCurrentCall({
        call: event,
        patient,
        isLoading: false,
      });
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
