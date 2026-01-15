import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  AsYouType,
  type PhoneNumber,
} from 'libphonenumber-js';

const DEFAULT_COUNTRY = 'US';

/**
 * Parse a phone number string into a PhoneNumber object.
 * Returns null if the input is empty or invalid.
 */
export function parsePhone(input: string): PhoneNumber | null {
  if (!input || !input.trim()) {
    return null;
  }
  return parsePhoneNumberFromString(input, DEFAULT_COUNTRY) || null;
}

/**
 * Check if a phone number string is valid.
 * Empty strings are considered valid (phone is optional).
 */
export function isValidPhone(input: string): boolean {
  if (!input || !input.trim()) {
    return true; // Empty is valid (optional field)
  }
  return isValidPhoneNumber(input, DEFAULT_COUNTRY);
}

/**
 * Normalize a phone number to E.164 format for storage.
 * Returns null if the input is empty or can't be parsed.
 * Uses isPossible() instead of isValid() to allow test numbers like 555-xxx-xxxx.
 *
 * @example
 * normalizePhone("555-123-4567") // "+15551234567"
 * normalizePhone("+44 20 1234 5678") // "+442012345678"
 */
export function normalizePhone(input: string): string | null {
  const phone = parsePhone(input);
  if (!phone || !phone.isPossible()) {
    return null;
  }
  return phone.format('E.164');
}

/**
 * Format a phone number as the user types.
 * Provides real-time formatting feedback.
 *
 * @example
 * formatPhoneAsYouType("555") // "555"
 * formatPhoneAsYouType("5551234") // "(555) 123-4"
 * formatPhoneAsYouType("5551234567") // "(555) 123-4567"
 */
export function formatPhoneAsYouType(input: string): string {
  if (!input) return '';
  const formatter = new AsYouType(DEFAULT_COUNTRY);
  return formatter.input(input);
}

/**
 * Format an E.164 phone number for display.
 * North American numbers (+1) are shown in national format, others in international format.
 *
 * @example
 * formatPhone("+15551234567") // "(555) 123-4567"
 * formatPhone("+442012345678") // "+44 20 1234 5678"
 */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) {
    return '—';
  }

  const phone = parsePhoneNumberFromString(e164);
  if (!phone) {
    return e164; // Fallback to raw value
  }

  // Use national format for North American numbers (+1: US, Canada, etc.)
  if (phone.countryCallingCode === '1') {
    return phone.formatNational();
  }

  // Use international format for all other countries
  return phone.formatInternational();
}
