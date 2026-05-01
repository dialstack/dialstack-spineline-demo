import { NextRequest, NextResponse } from 'next/server';
import { AvailabilitySearchWebhook, AvailabilitySearchResponse } from '@dialstack/sdk/server';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, addDays } from 'date-fns';
import { getTimezone } from '@/app/models/practice';
import AppointmentModel from '@/app/models/appointment';
import ProviderModel from '@/app/models/provider';
import { generateAvailabilities, unionAvailabilitySlots } from '@/lib/availability';
import { verifyToolCallWebhook } from '@/lib/dialstack-webhook';

// POST /api/dialstack/webhooks/availability/search
// DialStack's ai-agent calls this endpoint to search for available appointment slots.
export async function POST(request: NextRequest) {
  const verified = await verifyToolCallWebhook<AvailabilitySearchWebhook>(request);
  if (verified instanceof NextResponse) return verified;
  const { event, practice } = verified;

  // Get the practice's timezone early so we can parse dates correctly
  const timezone = getTimezone(practice);

  // Parse the requested time range
  // When the ai-agent sends date-only strings like "2026-04-14", JavaScript's
  // new Date("2026-04-14") interprets them as UTC midnight, which shifts the
  // range to the previous local day for North American timezones. We interpret
  // date-only inputs as the start of that day in the practice timezone.
  const { start_at, end_at } = event.query.filter.start_at_range;

  function parseDateInput(input: string, tz: string, exclusive = false): Date {
    // Date-only format: YYYY-MM-DD (10 chars, no T)
    if (input.length === 10 && !input.includes('T')) {
      const [year, month, day] = input.split('-').map(Number);
      const local = new Date(year!, month! - 1, day!);
      // For exclusive end bounds, advance to the start of the next day so
      // the entire final day is included in the range.
      return fromZonedTime(exclusive ? addDays(local, 1) : local, tz);
    }
    return new Date(input);
  }

  const rangeStart = parseDateInput(start_at, timezone);
  const rangeEnd = parseDateInput(end_at, timezone, true);

  // Earliest bookable instant: now + 1 hour. Past slots and slots within the
  // next hour must not be returned, otherwise the AI agent will offer times
  // it can no longer fulfill.
  const earliest = new Date(Date.now() + 60 * 60 * 1000);

  // Get existing appointments in this range
  const existingAppointments = await AppointmentModel.findByPractice(
    practice.id!,
    rangeStart,
    rangeEnd
  );

  // Calculate the range of days to iterate through in the practice's timezone
  // We need to expand the appointment query to cover all days that overlap
  const startZoned = toZonedTime(rangeStart, timezone);
  const endZoned = toZonedTime(rangeEnd, timezone);
  const queryStart = fromZonedTime(startOfDay(startZoned), timezone);
  const queryEnd = fromZonedTime(addDays(startOfDay(endZoned), 1), timezone);

  // Fetch appointments for the expanded range if needed
  const appointments =
    queryStart < rangeStart || queryEnd > rangeEnd
      ? await AppointmentModel.findByPractice(practice.id!, queryStart, queryEnd)
      : existingAppointments;

  // Fetch all providers for this practice
  const providers = await ProviderModel.findAllByPractice(practice.id!);

  // Helper to convert appointments to availability input format
  function toAvailabilityInput(apts: typeof appointments) {
    return apts.map((apt) => ({
      start_at: apt.start_at,
      end_at: apt.end_at,
      status: apt.status,
    }));
  }

  // Generate availability for each provider and union them
  // Any time where at least one provider is available is considered available overall
  let availabilities;

  if (providers.length === 0) {
    // No providers - fall back to practice-level availability (legacy behavior)
    availabilities = generateAvailabilities(
      timezone,
      rangeStart,
      rangeEnd,
      toAvailabilityInput(appointments),
      earliest
    );
  } else {
    // Group appointments by provider_id once (O(A) instead of O(P*A))
    // Appointments with NULL provider_id are ignored (don't block any provider)
    const appointmentsByProvider = new Map<number, typeof appointments>();
    for (const apt of appointments) {
      if (apt.provider_id !== null) {
        const list = appointmentsByProvider.get(apt.provider_id) ?? [];
        list.push(apt);
        appointmentsByProvider.set(apt.provider_id, list);
      }
    }

    // Generate per-provider availability and union them
    const providerAvailabilities = providers.map((provider) => {
      const providerAppointments = appointmentsByProvider.get(provider.id) ?? [];

      return generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        toAvailabilityInput(providerAppointments),
        earliest
      );
    });

    // Union all provider availabilities
    availabilities = unionAvailabilitySlots(providerAvailabilities);
  }

  return NextResponse.json<AvailabilitySearchResponse>({ availabilities });
}
