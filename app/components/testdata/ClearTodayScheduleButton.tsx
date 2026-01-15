'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useScheduleDate } from '@/app/hooks/ScheduleDateProvider';
import { useTimezone } from '@/app/hooks/TimezoneProvider';
import { useSelectedAppointment } from '@/app/hooks/SelectedAppointmentProvider';
import { Appointment } from '@/app/models/appointment';
import { getDayStartUTC, getDayEndUTC } from '@/lib/timezone';

export default function ClearTodayScheduleButton({ classes }: { classes?: string }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { selectedDate } = useScheduleDate();
  const { timezone } = useTimezone();
  const { selectedAppointmentId, setSelectedAppointmentId } = useSelectedAppointment();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClear = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build date range for the selected day (practice timezone converted to UTC)
      const dayStart = getDayStartUTC(selectedDate, timezone);
      const dayEnd = getDayEndUTC(selectedDate, timezone);

      // Fetch today's appointments
      const response = await fetch(
        `/api/appointments?start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`
      );

      if (!response.ok) {
        setError('Failed to fetch appointments');
        setLoading(false);
        return;
      }

      const appointments: Appointment[] = await response.json();

      if (appointments.length === 0) {
        setError('No appointments to clear');
        setLoading(false);
        return;
      }

      // Delete each appointment
      let deleted = 0;
      let deletedSelectedAppointment = false;
      for (const appointment of appointments) {
        const deleteResponse = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'DELETE',
        });

        if (deleteResponse.ok) {
          deleted++;
          if (appointment.id === selectedAppointmentId) {
            deletedSelectedAppointment = true;
          }
        }
      }

      // Close the panel if the selected appointment was deleted
      if (deletedSelectedAppointment) {
        setSelectedAppointmentId(null);
      }

      if (deleted === 0) {
        setError('Could not delete any appointments');
        setLoading(false);
        return;
      }

      // Success - invalidate appointments query to refresh the schedule
      setLoading(false);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`${classes || 'border'}`} variant="ghost" size="sm">
          Clear schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Clear schedule</DialogTitle>
          <DialogDescription>
            Delete all appointments for the currently displayed day. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex flex-row justify-end space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleClear} disabled={loading}>
            Clear schedule{' '}
            {loading && <LoaderCircle className="ml-2 animate-spin items-center" size={20} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
