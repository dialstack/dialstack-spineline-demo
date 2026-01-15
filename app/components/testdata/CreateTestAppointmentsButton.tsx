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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useScheduleDate } from '@/app/hooks/ScheduleDateProvider';
import { useTimezone } from '@/app/hooks/TimezoneProvider';
import { sample } from 'lodash-es';
import { Patient } from '@/app/models/patient';
import { Provider } from '@/app/models/provider';
import { AppointmentType } from '@/app/models/appointment';
import { createUTCFromMinutes } from '@/lib/timezone';

const formSchema = z.object({
  count: z.string(),
});

const APPOINTMENT_TYPES: AppointmentType[] = ['initial', 'adjustment', 'walk_in', 'follow_up'];

// Sample notes for each appointment type
const NOTES_BY_TYPE: Record<AppointmentType, string[]> = {
  initial: [
    'New patient consultation - comprehensive health history review and initial examination',
    'First visit evaluation including posture analysis and range of motion assessment',
    'Initial assessment with full spine X-rays and detailed consultation',
    'New patient intake, orthopedic testing, and treatment plan discussion',
    'Comprehensive first visit with neurological screening and spinal evaluation',
    'Initial consultation for chronic back pain - full diagnostic workup needed',
    'New patient exam including muscle strength testing and flexibility assessment',
    'First appointment - reviewing medical history and previous treatment records',
    'Initial evaluation for sports injury - assessing spine and extremity function',
    'New patient visit with digital posture analysis and spinal screening',
  ],
  adjustment: [
    'Routine spinal adjustment focusing on lumbar and thoracic regions',
    'Maintenance adjustment with soft tissue work on upper back and shoulders',
    'Regular chiropractic care - full spine adjustment and postural correction',
    'Spinal manipulation with focus on cervical spine and neck mobility',
    'Adjustment session including stretching exercises and home care review',
    'Routine visit for ongoing wellness care and spinal maintenance',
    'Full spine adjustment with emphasis on SI joint and pelvis alignment',
    'Regular adjustment with myofascial release on tight muscle groups',
    'Maintenance care focusing on mid-back tension and rib mobility',
    'Chiropractic adjustment with ergonomic counseling for desk workers',
  ],
  walk_in: [
    'Acute lower back pain after lifting - immediate assessment needed',
    'Sudden neck stiffness and limited range of motion since this morning',
    'Severe headache with upper cervical tension requiring urgent attention',
    'Acute shoulder and arm pain radiating from neck - rule out disc issue',
    'Walk-in for sharp mid-back pain that started during exercise',
    'Urgent visit for sciatica flare-up with numbness in left leg',
    'Acute wry neck - patient unable to turn head to the right',
    'Walk-in for rib pain after coughing - possible subluxation',
    'Emergency visit for acute low back spasm - difficulty standing',
    'Sudden onset of hip pain and stiffness affecting walking gait',
  ],
  follow_up: [
    'Two-week progress check following initial treatment plan implementation',
    'Re-evaluation of cervical spine after completing first phase of care',
    'Treatment plan review - assessing response to adjustments over past month',
    'Follow-up visit to review X-ray findings and discuss long-term care',
    'Progress assessment after six visits - updating treatment frequency',
    'Re-examination to measure improvement in range of motion and pain levels',
    'Follow-up on herniated disc treatment - evaluating conservative care results',
    'Monthly progress check for chronic lower back condition management',
    'Post-treatment evaluation following completion of corrective care phase',
    'Follow-up appointment to assess ergonomic changes and home exercise compliance',
  ],
};

// Durations weighted toward 15 and 30 minutes
const DURATIONS = [15, 15, 15, 30, 30, 45, 60];

// Test appointments generated between 9 AM and 5 PM (17:00)
const SCHEDULE_START_HOUR = 9;
const SCHEDULE_END_HOUR = 17;

interface TimeRange {
  startMinutes: number; // minutes from midnight
  endMinutes: number;
}

interface Slot {
  startMinutes: number;
  providerId: number;
  duration: number;
}

/**
 * Find all available slots for a given duration across all providers
 */
function findAvailableSlots(availableTime: Map<number, TimeRange[]>, duration: number): Slot[] {
  const slots: Slot[] = [];

  for (const [providerId, ranges] of availableTime) {
    for (const range of ranges) {
      // Generate slots at 15-minute increments within this range
      for (let start = range.startMinutes; start + duration <= range.endMinutes; start += 15) {
        slots.push({ startMinutes: start, providerId, duration });
      }
    }
  }

  return slots;
}

/**
 * Remove a time slot from a provider's available time
 */
function bookSlot(
  availableTime: Map<number, TimeRange[]>,
  providerId: number,
  startMinutes: number,
  duration: number
): void {
  const ranges = availableTime.get(providerId);
  if (!ranges) return;

  const endMinutes = startMinutes + duration;
  const newRanges: TimeRange[] = [];

  for (const range of ranges) {
    if (endMinutes <= range.startMinutes || startMinutes >= range.endMinutes) {
      // No overlap, keep the range
      newRanges.push(range);
    } else {
      // Overlap - split the range
      if (range.startMinutes < startMinutes) {
        newRanges.push({
          startMinutes: range.startMinutes,
          endMinutes: startMinutes,
        });
      }
      if (endMinutes < range.endMinutes) {
        newRanges.push({
          startMinutes: endMinutes,
          endMinutes: range.endMinutes,
        });
      }
    }
  }

  availableTime.set(providerId, newRanges);
}

/**
 * Generate appointment durations for the requested count,
 * weighted toward 15 and 30 minutes, sorted longest first
 */
function generateDurations(count: number): number[] {
  const durations: number[] = [];
  for (let i = 0; i < count; i++) {
    durations.push(sample(DURATIONS)!);
  }
  // Sort descending so we schedule longest appointments first
  return durations.sort((a, b) => b - a);
}

export default function CreateTestAppointmentsButton({ classes }: { classes?: string }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { selectedDate } = useScheduleDate();
  const { timezone } = useTimezone();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      count: '10',
    },
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    const count = parseInt(values.count, 10);

    try {
      // Fetch patients and providers
      const [patientsRes, providersRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/providers'),
      ]);

      if (!patientsRes.ok || !providersRes.ok) {
        setError('Failed to fetch patients or providers');
        setLoading(false);
        return;
      }

      const patients: Patient[] = await patientsRes.json();
      const providers: Provider[] = await providersRes.json();

      if (patients.length === 0) {
        setError('No patients found. Create test patients first.');
        setLoading(false);
        return;
      }

      if (providers.length === 0) {
        setError('No providers found. Create providers first.');
        setLoading(false);
        return;
      }

      // Initialize available time for each provider (9 AM to 5 PM)
      const availableTime = new Map<number, TimeRange[]>();
      for (const provider of providers) {
        availableTime.set(provider.id!, [
          {
            startMinutes: SCHEDULE_START_HOUR * 60,
            endMinutes: SCHEDULE_END_HOUR * 60,
          },
        ]);
      }

      // Generate durations upfront, sorted longest first
      const durations = generateDurations(count);

      // Schedule appointments, longest durations first
      let created = 0;
      for (const duration of durations) {
        // Find all available slots for this duration
        const availableSlots = findAvailableSlots(availableTime, duration);

        if (availableSlots.length === 0) {
          // No more slots available for this duration, skip
          continue;
        }

        // Pick a random slot
        const slot = sample(availableSlots)!;

        // Book the slot locally (update available time)
        bookSlot(availableTime, slot.providerId, slot.startMinutes, duration);

        // Create start/end times in practice timezone (converts to UTC)
        const startAt = createUTCFromMinutes(selectedDate, slot.startMinutes, timezone);
        const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

        // Random patient, type, and notes
        const patient = sample(patients)!;
        const type = sample(APPOINTMENT_TYPES)!;
        const notes = sample(NOTES_BY_TYPE[type])!;

        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            patient_id: patient.id,
            provider_id: slot.providerId,
            status: 'accepted',
            type,
            notes,
          }),
        });

        if (response.ok) {
          created++;
        }
      }

      if (created === 0) {
        setError('Could not create any appointments (all slots may be taken)');
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
          Create test appointments
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create test appointments</DialogTitle>
          <DialogDescription>
            Generate random appointments for the currently displayed day. Requires existing patients
            in the system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of appointments</FormLabel>
                  <FormControl>
                    <Select {...field} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20, 30, 40, 50].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-row justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="default" type="submit" disabled={loading}>
                Create appointments{' '}
                {loading && <LoaderCircle className="ml-2 animate-spin items-center" size={20} />}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
