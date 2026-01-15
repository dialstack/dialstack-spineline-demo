import { NextRequest } from 'next/server';
import Practice, { getTimezone } from '@/app/models/practice';
import dbConnect from '@/lib/dbConnect';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }
    await dbConnect();
    const user = await Practice.findByEmail(token.email);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(
      JSON.stringify({
        changedPassword: user.changedPassword || false,
        password: user.changedPassword ? '' : user.password || '',
        businessName: user.businessName || '',
        setup: user.setup || false,
        email: user.email || '',
        timezone: getTimezone(user),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred when retrieving account info');
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(message, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { timezone } = body;

    if (!timezone || typeof timezone !== 'string') {
      return new Response('Invalid timezone', { status: 400 });
    }

    // Validate timezone is a valid IANA identifier
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return new Response('Invalid timezone identifier', { status: 400 });
    }

    await dbConnect();
    const user = await Practice.findByEmail(token.email);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Update the config with the new timezone
    const updatedConfig = { ...user.config, timezone };
    await Practice.updateConfig(token.email, updatedConfig);

    return new Response(JSON.stringify({ timezone }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error({ error, message, stack }, 'An error occurred when updating account info');
    return new Response(message, { status: 500 });
  }
}
