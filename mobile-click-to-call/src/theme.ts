import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';

/**
 * Spineline's brand, lifted from the web app's tokens (spineline/app/global.css),
 * the same as the in-app calling demo in ../mobile.
 */
export const colors = {
  accent: '#0077b6',
  accentSubdued: '#e6f3f9',
  text: '#353a44',
  subdued: '#596171',
  offset: '#f5f6f8',
  surface: '#ffffff',
  border: '#d8dee4',
  success: '#1e884b',
  successSubdued: '#d6fce6',
  danger: '#c0392b',
} as const;

export const radius = 8;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Whether Inter is ready; screens wait on it so text isn't laid out in the fallback font. */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  return loaded || !!error;
}
