/**
 * Shared timezone utilities for consistent date/time handling across the application.
 * All functions use date-fns and date-fns-tz for timezone operations.
 */

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay, getHours, getMinutes, addMinutes } from 'date-fns';

/**
 * Get start of day (midnight) for a date in the browser's local timezone.
 * Useful for date navigation and comparisons.
 */
export function getLocalStartOfDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * Get end of day (23:59:59.999) for a date in the browser's local timezone.
 */
export function getLocalEndOfDay(date: Date): Date {
  return endOfDay(date);
}

/**
 * Convert a local date to UTC, interpreting it as being in the specified timezone.
 * Use this when you have a local date (e.g., from a date picker) and need to
 * store it as UTC in the database.
 *
 * Example: If local date is "2024-01-15 09:00" and timezone is "America/New_York",
 * this returns the UTC equivalent (2024-01-15 14:00 UTC during EST).
 */
export function localToUTC(localDate: Date, timezone: string): Date {
  return fromZonedTime(localDate, timezone);
}

/**
 * Convert a UTC date to the specified timezone for display.
 * Use this when you have a UTC date from the database and need to display
 * it in the practice's timezone.
 */
export function utcToLocal(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

/**
 * Get start of day in UTC for a given local date, interpreting the date
 * as being in the specified timezone.
 *
 * Use this for API queries when you need to fetch data for a specific day
 * in the practice's timezone.
 */
export function getDayStartUTC(localDate: Date, timezone: string): Date {
  return fromZonedTime(startOfDay(localDate), timezone);
}

/**
 * Get end of day in UTC for a given local date, interpreting the date
 * as being in the specified timezone.
 */
export function getDayEndUTC(localDate: Date, timezone: string): Date {
  return fromZonedTime(endOfDay(localDate), timezone);
}

/**
 * Format a date for display in a specific timezone.
 *
 * @param date - The date to format (typically UTC from database)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param formatStr - date-fns format string
 */
export function formatInTimezone(date: Date, timezone: string, formatStr: string): string {
  return format(toZonedTime(date, timezone), formatStr, { timeZone: timezone });
}

/**
 * Get the hour and minute components of a UTC date in the specified timezone.
 * Useful for positioning appointments on a schedule grid.
 */
export function getTimeInTimezone(
  utcDate: Date,
  timezone: string
): { hours: number; minutes: number } {
  const zonedDate = toZonedTime(utcDate, timezone);
  return {
    hours: getHours(zonedDate),
    minutes: getMinutes(zonedDate),
  };
}

/**
 * Calculate minutes since a reference hour for a UTC date in the specified timezone.
 * Returns -1 if the time is outside the specified range.
 *
 * @param utcDate - The UTC date to check
 * @param timezone - IANA timezone string
 * @param startHour - Start of range (e.g., 8 for 8 AM)
 * @param endHour - End of range (e.g., 18 for 6 PM)
 */
export function getMinutesSinceHour(
  utcDate: Date,
  timezone: string,
  startHour: number,
  endHour: number
): number {
  const { hours, minutes } = getTimeInTimezone(utcDate, timezone);

  if (hours >= startHour && hours < endHour) {
    return (hours - startHour) * 60 + minutes;
  }
  return -1;
}

/**
 * Create a UTC date from a local date and minutes offset from midnight.
 * Useful for creating appointment times from a schedule grid.
 *
 * @param localDate - The local date (day reference)
 * @param minutesFromMidnight - Minutes from midnight (e.g., 540 for 9:00 AM)
 * @param timezone - IANA timezone string
 */
export function createUTCFromMinutes(
  localDate: Date,
  minutesFromMidnight: number,
  timezone: string
): Date {
  const zonedDateTime = addMinutes(startOfDay(localDate), minutesFromMidnight);
  return fromZonedTime(zonedDateTime, timezone);
}
