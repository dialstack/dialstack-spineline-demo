'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ScheduleDateContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const ScheduleDateContext = createContext<ScheduleDateContextType | null>(null);

export function ScheduleDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  return (
    <ScheduleDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </ScheduleDateContext.Provider>
  );
}

export function useScheduleDate() {
  const context = useContext(ScheduleDateContext);
  if (!context) {
    throw new Error('useScheduleDate must be used within a ScheduleDateProvider');
  }
  return context;
}
