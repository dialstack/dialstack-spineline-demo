/**
 * Availability generation algorithm for calculating available appointment slots.
 * Extracted from the webhook handler for testability.
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getDay, addDays } from 'date-fns';
import { formatInTimezone } from './timezone';

// Business hours configuration
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;

export interface Appointment {
  start_at: Date;
  end_at: Date;
  status: string;
}

export interface AvailabilitySlot {
  start_at: string;
  duration_minutes: number;
}

interface TimeEvent {
  time: number;
  isStart: boolean;
}

/**
 * Union multiple provider availability slot arrays into a single availability.
 * Any time slot where at least one provider is available is included in the result.
 *
 * Uses a sweep line algorithm to merge overlapping/adjacent slots efficiently.
 *
 * @param providerSlots - Array of availability slots per provider
 * @returns Merged availability slots where at least one provider was available
 */
export function unionAvailabilitySlots(providerSlots: AvailabilitySlot[][]): AvailabilitySlot[] {
  // If no providers or all empty, return empty
  if (providerSlots.length === 0 || providerSlots.every((slots) => slots.length === 0)) {
    return [];
  }

  // Flatten and convert to time events
  const events: TimeEvent[] = [];
  for (const slots of providerSlots) {
    for (const slot of slots) {
      const startMs = new Date(slot.start_at).getTime();
      const endMs = startMs + slot.duration_minutes * 60000;
      events.push({ time: startMs, isStart: true });
      events.push({ time: endMs, isStart: false });
    }
  }

  // Sort by time, with starts before ends at same time (to merge adjacent slots)
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    // At same time: starts before ends (allows adjacent slots to merge)
    return a.isStart ? -1 : 1;
  });

  // Extract timezone offset from first available slot (before sweep line)
  const firstSlot = providerSlots.find((slots) => slots.length > 0)?.[0];
  const tzMatch = firstSlot?.start_at.match(/([+-]\d{2}:\d{2})$/);
  const tzOffset = tzMatch ? tzMatch[1] : 'Z';

  // Sweep line to find union intervals
  const result: AvailabilitySlot[] = [];
  let activeCount = 0;
  let unionStart: number | null = null;

  for (const event of events) {
    if (event.isStart) {
      if (activeCount === 0) {
        unionStart = event.time;
      }
      activeCount++;
    } else {
      activeCount--;
      if (activeCount === 0 && unionStart !== null) {
        const start = new Date(unionStart);
        const durationMinutes = Math.round((event.time - unionStart) / 60000);
        const startStr = formatDateWithOffset(start, tzOffset);
        result.push({
          start_at: startStr,
          duration_minutes: durationMinutes,
        });
        unionStart = null;
      }
    }
  }

  return result;
}

/**
 * Format a Date with a specific timezone offset string.
 */
function formatDateWithOffset(date: Date, offset: string): string {
  // Parse the offset to get hours and minutes
  const match = offset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) {
    return date.toISOString();
  }

  const sign = match[1] === '+' ? 1 : -1;
  const offsetHours = parseInt(match[2], 10);
  const offsetMinutes = parseInt(match[3], 10);
  const totalOffsetMs = sign * (offsetHours * 60 + offsetMinutes) * 60000;

  // Adjust UTC time to local time
  const localTime = new Date(date.getTime() + totalOffsetMs);

  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');
  const hours = String(localTime.getUTCHours()).padStart(2, '0');
  const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}

/**
 * Generate available time slots for a practice given a time range.
 *
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param rangeStart - Start of the requested time range (UTC)
 * @param rangeEnd - End of the requested time range (UTC)
 * @param existingAppointments - Existing appointments that block availability
 * @param now - Current time for filtering past slots (defaults to now)
 * @returns Array of available time slots with start time and duration
 */
export function generateAvailabilities(
  timezone: string,
  rangeStart: Date,
  rangeEnd: Date,
  existingAppointments: Appointment[],
  now: Date = new Date()
): AvailabilitySlot[] {
  const availabilities: AvailabilitySlot[] = [];

  // Calculate the range of days to iterate through in the practice's timezone
  // Extract date components in target timezone to avoid system-timezone-dependent operations
  const startZoned = toZonedTime(rangeStart, timezone);
  const endZoned = toZonedTime(rangeEnd, timezone);

  // Use the local representation of startZoned (which shows target timezone values)
  let currentYear = startZoned.getFullYear();
  let currentMonth = startZoned.getMonth();
  let currentDay = startZoned.getDate();

  // Filter to active appointments (not cancelled/declined)
  const allActiveAppointments = existingAppointments.filter(
    (apt) => apt.status !== 'cancelled' && apt.status !== 'declined'
  );

  // Create a Date representing the current day for iteration
  // This Date's local values represent the target timezone's date
  let currentDateLocal = new Date(currentYear, currentMonth, currentDay);

  while (currentDateLocal <= endZoned) {
    // Skip weekends (0 = Sunday, 6 = Saturday) in practice's timezone
    const dayOfWeek = getDay(currentDateLocal);
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Calculate business hours in UTC for this day
      // Create local Dates with target timezone values, then convert to UTC
      const dayStartLocal = new Date(
        currentYear,
        currentMonth,
        currentDay,
        BUSINESS_START_HOUR,
        0,
        0
      );
      const dayEndLocal = new Date(currentYear, currentMonth, currentDay, BUSINESS_END_HOUR, 0, 0);
      let dayStart = fromZonedTime(dayStartLocal, timezone);
      let dayEnd = fromZonedTime(dayEndLocal, timezone);

      // Clip to the requested range
      if (dayStart < rangeStart) dayStart = rangeStart;
      if (dayEnd > rangeEnd) dayEnd = rangeEnd;

      // Skip if the clipped range is invalid
      if (dayStart >= dayEnd) {
        currentDateLocal = addDays(currentDateLocal, 1);
        currentYear = currentDateLocal.getFullYear();
        currentMonth = currentDateLocal.getMonth();
        currentDay = currentDateLocal.getDate();
        continue;
      }

      // Get appointments for this day, sorted by start time
      const dayAppointments = allActiveAppointments
        .filter((apt) => {
          const aptStart = new Date(apt.start_at);
          const aptEnd = new Date(apt.end_at);
          return aptStart < dayEnd && aptEnd > dayStart;
        })
        .map((apt) => ({
          start: new Date(apt.start_at),
          end: new Date(apt.end_at),
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      // Walk through the day finding available windows
      let windowStart = dayStart;

      for (const apt of dayAppointments) {
        // Clamp appointment times to business hours
        const aptStart = apt.start < dayStart ? dayStart : apt.start;
        const aptEnd = apt.end > dayEnd ? dayEnd : apt.end;

        // If there's a gap before this appointment, it's an available window
        if (aptStart > windowStart) {
          let start = windowStart > now ? windowStart : now;
          // Ensure start is never before rangeStart (handles timezone edge cases)
          if (start < rangeStart) {
            start = rangeStart;
          }
          // Ensure end is never after rangeEnd
          const end = aptStart > rangeEnd ? rangeEnd : aptStart;
          if (start < end) {
            availabilities.push({
              start_at: formatInTimezone(start, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
              duration_minutes: Math.round((end.getTime() - start.getTime()) / 60000),
            });
          }
        }

        // Move window start past this appointment
        if (aptEnd > windowStart) {
          windowStart = aptEnd;
        }
      }

      // Add remaining time after last appointment
      if (windowStart < dayEnd) {
        let start = windowStart > now ? windowStart : now;
        // Ensure start is never before rangeStart (handles timezone edge cases)
        if (start < rangeStart) {
          start = rangeStart;
        }
        // Ensure end is never after rangeEnd
        const end = dayEnd > rangeEnd ? rangeEnd : dayEnd;
        if (start < end) {
          availabilities.push({
            start_at: formatInTimezone(start, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
            duration_minutes: Math.round((end.getTime() - start.getTime()) / 60000),
          });
        }
      }
    }

    // Move to next day in practice's timezone
    currentDateLocal = addDays(currentDateLocal, 1);
    currentYear = currentDateLocal.getFullYear();
    currentMonth = currentDateLocal.getMonth();
    currentDay = currentDateLocal.getDate();
  }

  return availabilities;
}
