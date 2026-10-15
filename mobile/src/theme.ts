import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { SoftphoneProviderProps } from '@dialstack/sdk-native';

/**
 * Spineline's brand, lifted from the web app's tokens (spineline/app/global.css)
 * so the phone and the browser read as one product.
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

/**
 * Whether Inter is ready. Screens wait on it rather than the root layout: the
 * navigator has to mount on the first render, but text laid out in the fallback
 * font keeps the wrong width (truncated tab labels) once Inter swaps in.
 */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  return loaded || !!error;
}

/** The same brand handed to the SDK's own UI, so the drop-in softphone matches. */
export const softphoneAppearance: SoftphoneProviderProps['appearance'] = {
  theme: 'light',
  variables: {
    colorPrimary: colors.accent,
    colorBackground: colors.surface,
    colorSurfaceSubtle: colors.offset,
    colorText: colors.text,
    colorTextSecondary: colors.subdued,
    colorBorder: colors.border,
    colorSuccess: colors.success,
    colorDanger: colors.danger,
  },
};
