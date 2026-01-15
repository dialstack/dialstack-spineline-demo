'use client';

import { DialstackComponentsProvider } from '@dialstack/sdk';
import { EmbeddedComponentProvider } from '@/app/hooks/EmbeddedComponentProvider';
import { useDialstack } from '@/app/hooks/useDialstack';

export const EmbeddedComponentWrapper = ({ children }: { children: React.ReactNode }) => {
  const { hasError, dialstackInstance } = useDialstack();

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
