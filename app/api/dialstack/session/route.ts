import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDialstack } from '@/lib/dialstack';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.dialstackAccountId) {
      return new Response(
        JSON.stringify({
          error: 'No authenticated user found',
        }),
        { status: 401 }
      );
    }

    const accountId = session.user.dialstackAccountId;

    const dialstackSession = await getDialstack().accountSessions.create({
      account: accountId,
    });

    return new Response(
      JSON.stringify({
        account_id: accountId,
        client_secret: dialstackSession.client_secret,
        expires_at: dialstackSession.expires_at,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('An error occurred when calling the DialStack API to create a session', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
