import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Practice from '@/app/models/practice';
import dbConnect from '@/lib/dbConnect';
import logger from '@/lib/logger';

// GET returns whether the AI agent is configured, without leaking the secret.
// PATCH accepts { ai_agent_id, voice_app_secret } and stores them on the practice.
// Either field may be empty string to clear it.

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
        ai_agent_id: user.dialstack_ai_agent_id ?? '',
        voice_app_secret_set: Boolean(user.dialstack_voice_app_secret),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred when retrieving AI agent config');
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

    let body: { ai_agent_id?: string; voice_app_secret?: string };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const updates: {
      dialstack_ai_agent_id?: string | null;
      dialstack_voice_app_secret?: string | null;
    } = {};

    if (typeof body.ai_agent_id === 'string') {
      const trimmed = body.ai_agent_id.trim();
      // dialstack_ai_agent_id is a varchar(50) column; without this guard an
      // oversized paste would hit a Postgres truncation error and surface as
      // an opaque 500.
      if (trimmed.length > 50) {
        return new Response('ai_agent_id too long', { status: 400 });
      }
      updates.dialstack_ai_agent_id = trimmed || null;
    }
    if (typeof body.voice_app_secret === 'string') {
      // Empty string clears the secret; otherwise store verbatim (no trimming — secrets
      // are opaque tokens and trimming could silently corrupt them).
      updates.dialstack_voice_app_secret =
        body.voice_app_secret === '' ? null : body.voice_app_secret;
    }

    if (Object.keys(updates).length === 0) {
      return new Response('No fields to update', { status: 400 });
    }

    await dbConnect();
    await Practice.update(token.email, updates);

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error({ error, message }, 'An error occurred when updating AI agent config');
    return new Response(message, { status: 500 });
  }
}
