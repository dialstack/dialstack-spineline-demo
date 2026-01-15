'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Schedule from '@/app/components/Schedule';
import Container from '@/app/components/Container';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppointmentPanel } from '@/app/components/appointments/AppointmentPanel';
import { useSelectedAppointment } from '@/app/hooks/SelectedAppointmentProvider';
import type { Appointment } from '@/app/models/appointment';

/**
 * Create a new appointment
 */
const createAppointment = async (data: Partial<Appointment>): Promise<Appointment> => {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create appointment: ${res.status}`);
  }

  return res.json();
};

export default function Dashboard() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { selectedAppointmentId, setSelectedAppointmentId } = useSelectedAppointment();

  if (!session) {
    redirect('/');
  }

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: (createdAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointmentId(createdAppointment.id!);
    },
  });

  // Handle adding a new appointment
  const handleAddAppointment = () => {
    // Create appointment with default values (now + 30 minutes)
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0); // Round to next 15 min
    const endAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes later

    createMutation.mutate({
      start_at: now,
      end_at: endAt,
      type: 'adjustment',
      status: 'pending',
    });
  };

  return (
    <>
      <div
        className={`transition-all duration-300 ease-out ${
          selectedAppointmentId !== null ? '-translate-x-[190px]' : ''
        }`}
      >
        {/* Header with title and add button */}
        <div className="flex items-center gap-4">
          <h1 className="flex-1 text-3xl font-bold text-primary" data-testid="title-header">
            Welcome back!
          </h1>

          <Button onClick={handleAddAppointment} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Appointment
          </Button>
        </div>

        <div className="mt-6 flex flex-col items-start gap-2 md:gap-5">
          <Container className="flex w-full flex-1 flex-col p-5">
            <Schedule onAppointmentClick={(id) => setSelectedAppointmentId(id)} />
          </Container>
        </div>
      </div>

      {/* Appointment details panel */}
      <AppointmentPanel
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
      />
    </>
  );
}
