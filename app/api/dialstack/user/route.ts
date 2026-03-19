import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDialstackForAccount } from '@/lib/dialstack';

// Fetch the DialStack user for the current practice, creating it if it doesn't exist
export async function GET() {
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
    const email = session.user.email;

    const dialstack = await getDialstackForAccount(accountId);

    // Fetch users for this account
    const { data: users } = await dialstack.users.list({}, { dialstackAccount: accountId });

    // If no user exists, create one opportunistically
    if (users.length === 0) {
      const newUser = await dialstack.users.create({ email }, { dialstackAccount: accountId });
      return new Response(JSON.stringify(newUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the first (and should be only) user
    return new Response(JSON.stringify(users[0]), {
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
