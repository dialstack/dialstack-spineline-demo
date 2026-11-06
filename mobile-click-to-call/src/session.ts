import * as spineline from '@spineline/spineline';
import { clearTokens, getSpinelineToken, setDialstackUserId, setSpinelineToken } from './storage';

/** Sign-in and sign-out, over storage so a relaunch knows who is signed in. */

export const isSignedIn = () => getSpinelineToken() !== null;

export async function signIn(email: string, password: string): Promise<void> {
  setSpinelineToken(await spineline.login(email, password));
  // The practice's DialStack user, created if it has none yet. Its id is what
  // the rig needs: the user whose cell rings and whose routing it writes.
  try {
    setDialstackUserId((await spineline.ensureDialstackUser()).id);
  } catch (err) {
    clearTokens();
    throw err;
  }
}

export async function signOut(): Promise<void> {
  clearTokens();
}
