import { NextRequest, NextResponse } from 'next/server';
import { DialStack, WebhookErrorResponse } from '@dialstack/sdk/server';
import PracticeModel, { Practice } from '@/app/models/practice';
import logger from '@/lib/logger';

// Pre-auth failures (unknown account, unconfigured practice, bad signature)
// all return the same response so an unauthenticated caller cannot enumerate
// which DialStack account IDs are registered or which have the AI configured.
// The real reason is logged server-side for operators.
function unauthorized(): NextResponse<WebhookErrorResponse> {
  return NextResponse.json<WebhookErrorResponse>(
    { error: { code: 'invalid_signature', message: 'Unauthorized' } },
    { status: 401 }
  );
}

/**
 * Shared verification for inbound AI-agent tool-call webhooks.
 *
 * The managed ai-agent service signs each tool-call request with the
 * voice-app's HMAC secret. Each spineline practice stores its own
 * voice-app secret (captured from the DialStack admin app), so we look
 * the practice up by `account_id` and verify against that practice's
 * secret. Returns either a typed event + practice, or a NextResponse
 * with the appropriate error body for the caller to `return` directly.
 */
export async function verifyToolCallWebhook<T extends { account_id: string }>(
  request: NextRequest
): Promise<{ event: T; practice: Practice } | NextResponse<WebhookErrorResponse>> {
  const body = await request.text();
  const signature = request.headers.get('x-dialstack-signature');

  if (!signature) {
    logger.warn('Tool-call webhook rejected: missing signature header');
    return unauthorized();
  }

  // We need `account_id` before we can pick the signing secret. Parse the
  // raw body once (unverified) just to extract it — verification still runs
  // against the same body bytes below.
  let parsed: { account_id?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json<WebhookErrorResponse>(
      { error: { code: 'invalid_payload', message: 'Invalid JSON payload' } },
      { status: 400 }
    );
  }

  if (!parsed.account_id || typeof parsed.account_id !== 'string') {
    return NextResponse.json<WebhookErrorResponse>(
      { error: { code: 'invalid_payload', message: 'Missing account_id' } },
      { status: 400 }
    );
  }

  const practice = await PracticeModel.findByDialstackAccountId(parsed.account_id);
  if (!practice || !practice.id) {
    logger.warn({ account_id: parsed.account_id }, 'Tool-call webhook rejected: unknown account');
    return unauthorized();
  }

  if (!practice.dialstack_voice_app_secret) {
    logger.warn(
      { account_id: parsed.account_id, practice_id: practice.id },
      'Tool-call webhook rejected: practice has no voice-app secret configured'
    );
    return unauthorized();
  }

  let event: T;
  try {
    event = DialStack.webhooks.constructEvent<T>(
      body,
      signature,
      practice.dialstack_voice_app_secret
    );
  } catch (err) {
    logger.error(
      { err: String(err), account_id: parsed.account_id, practice_id: practice.id },
      'Tool-call webhook signature verification failed'
    );
    return unauthorized();
  }

  return { event, practice };
}
