import { type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Practice from '@/app/models/practice';
import dbConnect from '@/lib/dbConnect';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const json = await req.json();
    const { newEmail, inputPassword } = json;

    if (!newEmail || !inputPassword) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await dbConnect();

    // Check if new email is the same as current email
    if (token.email === newEmail) {
      return new Response(JSON.stringify({ error: 'New email is the same as the old email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate current password
    const user = await Practice.findByEmail(token.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await Practice.validatePassword(user, inputPassword);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if new email is already in use
    const existingUser = await Practice.findByEmail(newEmail);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already in use' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update email
    await Practice.updateEmail(token.email, newEmail);

    logger.info({ oldEmail: token.email, newEmail }, 'Email updated successfully');

    return new Response(
      JSON.stringify({
        email: newEmail,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred when updating account email');
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
