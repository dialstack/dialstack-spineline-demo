import { NextRequest } from 'next/server';
import Practice from '@/app/models/practice';
import Provider from '@/app/models/provider';
import dbConnect from '@/lib/dbConnect';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

/**
 * GET /api/providers
 * Returns all providers for the authenticated practice
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response('Practice not found', { status: 404 });
    }

    const providers = await Provider.findAllByPractice(practice.id);

    return new Response(JSON.stringify(providers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred when retrieving providers');
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(message, { status: 500 });
  }
}

/**
 * POST /api/providers
 * Creates a new provider for the authenticated practice
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();

    if (!body.first_name || !body.last_name) {
      return new Response('First name and last name are required', {
        status: 400,
      });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response('Practice not found', { status: 404 });
    }

    const provider = await Provider.create(practice.id, {
      first_name: body.first_name,
      last_name: body.last_name,
      specialty: body.specialty || null,
    });

    return new Response(JSON.stringify(provider), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred when creating provider');
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(message, { status: 500 });
  }
}
