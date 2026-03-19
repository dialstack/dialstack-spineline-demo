'use client';

import { useContext, useEffect } from 'react';
import { DialstackComponentsProvider } from '@dialstack/sdk/react';
import { EmbeddedComponentProvider } from '@/app/hooks/EmbeddedComponentProvider';
import { useDialstack } from '@/app/hooks/useDialstack';
import { SettingsContext } from '@/app/contexts/settings/SettingsContext';

export const EmbeddedComponentWrapper = ({ children }: { children: React.ReactNode }) => {
  const { hasError, dialstackInstance } = useDialstack();
  const settings = useContext(SettingsContext);

  // Sync brand settings to SDK appearance so embedded components pick up the theme.
  // Default to spineline's accent blue (#0077b6) when no custom color is configured.
  const primaryColor = settings.primaryColor || '#0077b6';

  useEffect(() => {
    if (!dialstackInstance) return;
    dialstackInstance.update({
      appearance: {
        variables: {
          colorPrimary: primaryColor,
          fontFamily: 'var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif',
        },
      },
    });
  }, [dialstackInstance, primaryColor]);

  if (hasError || !dialstackInstance) {
    return null;
  }

  return (
    <DialstackComponentsProvider dialstack={dialstackInstance}>
      <EmbeddedComponentProvider dialstackInstance={dialstackInstance}>
        {children}
      </EmbeddedComponentProvider>
    </DialstackComponentsProvider>
  );
};
