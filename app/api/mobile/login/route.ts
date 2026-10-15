import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { validateCredentials } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import logger from '@/lib/logger';

// 30 days, NextAuth's own session default — the demo app stays signed in.
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * POST /api/mobile/login  { email, password } → { token, expires_at }
 *
 * The mobile app can't ride the NextAuth cookie + CSRF form flow, so it trades
 * credentials for the same encrypted JWT the session cookie carries. Every route
 * that authenticates with getToken({ req }) accepts it as
 * `Authorization: Bearer <token>` — no separate token store to keep in sync.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { email, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = await validateCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Same shape the jwt callback in lib/auth.ts produces for a cookie session.
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        user: { id: user.id, email: user.email, dialstackAccountId: user.dialstackAccountId },
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: MAX_AGE_SECONDS,
    });

    logger.info({ userId: user.id }, 'Mobile sign-in');
    return NextResponse.json({
      token,
      expires_at: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    });
  } catch (err) {
    logger.error({ err }, 'Mobile sign-in failed');
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 500 });
  }
}
