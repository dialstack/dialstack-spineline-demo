import { DialStack, type User } from '@dialstack/sdk/server';

// Lazy initialization to avoid build-time errors when env vars aren't set
let _dialstack: DialStack | null = null;

export function getDialstack(): DialStack {
  if (!_dialstack) {
    _dialstack = new DialStack(process.env.DIALSTACK_SECRET_KEY, {
      apiUrl: process.env.DIALSTACK_API_URL,
    });
  }
  return _dialstack;
}

// Resolve the logged-in practice's DialStack user from a list. An account can
// have several users, so match on the session email; fall back to the sole user
// for a single-user account. Both the user route (click-to-call) and the
// WebRTC-session route MUST resolve the SAME user, or the softphone connects as
// a different user than click-to-call rings — so this lives in one place.
export function resolveAccountUser(
  users: User[],
  email: string | null | undefined
): User | undefined {
  return (
    (email && users.find((u) => u.email === email)) || (users.length === 1 ? users[0] : undefined)
  );
}
