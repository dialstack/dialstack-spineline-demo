import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as session from './session';
import { onTokensCleared } from './storage';

type Auth = {
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** React's view of session.ts, so screens re-render on sign-in and sign-out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(session.isSignedIn);
  useEffect(() => onTokensCleared(() => setSignedIn(false)), []);

  const signIn = useCallback(async (email: string, password: string) => {
    await session.signIn(email, password);
    setSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await session.signOut();
    setSignedIn(false);
  }, []);

  const value = useMemo(() => ({ signedIn, signIn, signOut }), [signedIn, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
