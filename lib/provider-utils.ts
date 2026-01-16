/**
 * Format provider information for booking notes.
 */
export function formatProviderNotes(
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string | null;
  } | null
): string | undefined {
  if (!provider) return undefined;
  const name = `${provider.first_name} ${provider.last_name}`;
  return provider.specialty ? `Provider: ${name} (${provider.specialty})` : `Provider: ${name}`;
}
