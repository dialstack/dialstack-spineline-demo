import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDialstack, resolveAccountUser } from '@/lib/dialstack';

// Mints a WebRTC *user* session token for the embedded <Softphone>. Unlike
// /api/dialstack/session (an account/component session for the data widgets),
// the Softphone authenticates as a specific DialStack user on the calling
// WebSocket, so we mint a user_session for the logged-in practice's user.
//
// Resolve the user by the session EMAIL (matching /api/dialstack/user), NOT
// users.list()[0] — an account can have several users, and the softphone must be
// the SAME user click-to-call rings (which also resolves by email). Picking the
// first user made the softphone connect as a different user than click-to-call
// targeted, so click-to-call rang a user with no live session. Unlike
// /api/dialstack/user this does NOT create a user — no match means no Softphone
// (409), so the client leaves the softphone touchpoints unrendered.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.dialstackAccountId) {
      return new Response(JSON.stringify({ error: 'No authenticated user found' }), {
        status: 401,
      });
    }

    const accountId = session.user.dialstackAccountId;
    const email = session.user.email;
    const dialstack = getDialstack();

    const { data: users } = await dialstack.users.list({}, { dialstackAccount: accountId });

    const user = resolveAccountUser(users, email);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No DialStack user provisioned for this account' }),
        { status: 409 }
      );
    }

    const userSession = await dialstack.userSessions.create({ user: user.id });

    return new Response(
      JSON.stringify({
        user_id: user.id,
        client_secret: userSession.client_secret,
        expires_at: userSession.expires_at,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('An error occurred minting a DialStack WebRTC user session', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
