'use client';

import { useCallback } from 'react';
import type { Patient } from '@/app/models/patient';

/**
 * Look up a patient by caller phone number against the practice's records.
 * Shared by the ScreenPop panel and the softphone incoming banner so both
 * surfaces match callers the same way.
 */
export function useLookupPatient() {
  return useCallback(async (phone: string): Promise<Patient | null> => {
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
}
