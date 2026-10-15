'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient } from '@/app/models/patient';

const lookupKey = (phone: string) => ['patient-lookup', phone];

async function fetchPatient(phone: string): Promise<Patient | null> {
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
}

/**
 * Look up a patient by caller phone number against the practice's records.
 * Shared by the ScreenPop panel and the softphone so both surfaces match callers
 * the same way. Cached per number, so the several places that ask about the
 * same call share one request.
 */
export function useLookupPatient() {
  const queryClient = useQueryClient();
  return useCallback(
    (phone: string) =>
      queryClient.query({
        queryKey: lookupKey(phone),
        queryFn: () => fetchPatient(phone),
        staleTime: 60_000,
      }),
    [queryClient]
  );
}

/** The cached lookup for a number, if one has finished: lets a card skip the spinner. */
export function usePeekPatient() {
  const queryClient = useQueryClient();
  return useCallback(
    (phone: string): Patient | null | undefined => queryClient.getQueryData(lookupKey(phone)),
    [queryClient]
  );
}
