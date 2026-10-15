import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDialstack, resolveAccountUser } from '@/lib/dialstack';

// Fetch the DialStack user for the current practice, creating it if it doesn't exist
export async function GET(req: NextRequest) {
  try {
    // getToken, not getServerSession: it also accepts the mobile app's
    // `Authorization: Bearer` token from /api/mobile/login.
    const token = await getToken({ req });

    if (!token?.user?.dialstackAccountId) {
      return new Response(
        JSON.stringify({
          error: 'No authenticated user found',
        }),
        { status: 401 }
      );
    }

    const accountId = token.user.dialstackAccountId;
    const email = token.email;

    const dialstack = getDialstack();

    // Fetch users for this account
    const { data: users } = await dialstack.users.list({}, { dialstackAccount: accountId });

    // Resolve the logged-in practice's user; create one if there's no match.
    const existing = resolveAccountUser(users, email);

    if (existing) {
      return new Response(JSON.stringify(existing), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No matching user — create one for this practice.
    const newUser = await dialstack.users.create({ email }, { dialstackAccount: accountId });
    return new Response(JSON.stringify(newUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('An error occurred when calling the DialStack API to fetch user', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
