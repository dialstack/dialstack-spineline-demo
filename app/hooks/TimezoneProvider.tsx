'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccountInfo } from '@/lib/api/account';

interface TimezoneContextType {
  timezone: string;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['accountInfo'],
    queryFn: fetchAccountInfo,
  });

  const timezone = data?.timezone || 'America/New_York';

  return (
    <TimezoneContext.Provider value={{ timezone, isLoading }}>{children}</TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
