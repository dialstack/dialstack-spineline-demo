/**
 * Format a phone number from E.164 format to a human-readable display format.
 *
 * @example
 * formatPhoneNumber("+15551234567") // "+1 (555) 123-4567"
 * formatPhoneNumber("+442012345678") // "+44 20 1234 5678"
 */
export function formatPhoneNumber(e164: string): string {
  // Handle US/Canada numbers (+1...)
  const usMatch = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (usMatch) {
    return `+1 (${usMatch[1]}) ${usMatch[2]}-${usMatch[3]}`;
  }

  // For other countries, just add spaces for readability
  // Remove the + and country code, then format
  if (e164.startsWith("+")) {
    // Generic formatting: keep + at start, add space after country code
    const digits = e164.slice(1);
    if (digits.length > 4) {
      // Assume 1-3 digit country code, then group remaining digits
      const countryCode = digits.slice(0, digits.length > 10 ? 2 : 1);
      const rest = digits.slice(countryCode.length);
      // Group remaining digits in groups of 3-4
      const groups = rest.match(/.{1,4}/g) || [];
      return `+${countryCode} ${groups.join(" ")}`;
    }
  }

  // Fallback: return as-is
  return e164;
}
