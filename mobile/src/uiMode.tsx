import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Which Level 1 flavour the Phone tab shows: the SDK's own <Softphone>, or
 * Spineline's screens drawn on useSoftphone(). Both sit under the same
 * <SoftphoneProvider>, so switching mid-demo keeps the connection and any call.
 */
export type UiMode = 'drop-in' | 'custom';

const UiModeContext = createContext<[UiMode, (m: UiMode) => void] | null>(null);

export function UiModeProvider({ children }: { children: ReactNode }) {
  const state = useState<UiMode>('drop-in');
  return <UiModeContext.Provider value={state}>{children}</UiModeContext.Provider>;
}

export function useUiMode(): [UiMode, (m: UiMode) => void] {
  const ctx = useContext(UiModeContext);
  if (!ctx) throw new Error('useUiMode must be used inside <UiModeProvider>');
  return ctx;
}
