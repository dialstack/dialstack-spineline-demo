"use client";

import * as React from "react";

interface SelectedAppointmentContextType {
  selectedAppointmentId: number | null;
  setSelectedAppointmentId: (id: number | null) => void;
}

const SelectedAppointmentContext =
  React.createContext<SelectedAppointmentContextType | null>(null);

export function SelectedAppointmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedAppointmentId, setSelectedAppointmentId] = React.useState<
    number | null
  >(null);

  return (
    <SelectedAppointmentContext.Provider
      value={{ selectedAppointmentId, setSelectedAppointmentId }}
    >
      {children}
    </SelectedAppointmentContext.Provider>
  );
}

export function useSelectedAppointment() {
  const context = React.useContext(SelectedAppointmentContext);
  if (!context) {
    throw new Error(
      "useSelectedAppointment must be used within a SelectedAppointmentProvider",
    );
  }
  return context;
}
