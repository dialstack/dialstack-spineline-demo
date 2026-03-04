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

    // Base components for voice/telephony pages
    const components: Record<string, { enabled: boolean }> = {
      call_logs: { enabled: true },
      voicemails: { enabled: true },
      call_history: { enabled: true },
      phone_numbers: { enabled: true },
      dial_plan_viewer: { enabled: true },
    };

    // Only grant onboarding write scopes when the feature is enabled.
    // This limits the blast radius of the session token on non-onboarding pages.
    if (process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === 'true') {
      components.account_onboarding = { enabled: true };
    }

    const dialstackSession = await getDialstack().accountSessions.create({
      account: accountId,
      components,
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
