import { NextRequest, NextResponse } from 'next/server';
import { DialStack, WebhookErrorResponse } from '@dialstack/sdk/server';
import PracticeModel, { Practice } from '@/app/models/practice';
import { getPracticeAIAgentSecret } from '@/lib/dialstack-ai-agent';
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

// In-process secret cache. We rate-limit the upstream refresh path to a
// single fetch every REFRESH_COOLDOWN_MS so an attacker who knows an
// account_id can't turn invalid-signature spam into a DialStack-call
// amplification path. Real upstream rotation recovers within the cooldown.
interface CachedSecret {
  secret: string;
  fetchedAt: number;
}
const secretCache = new Map<string, CachedSecret>();
const refreshLockedUntil = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 30_000;

// Webhook signatures sign `${timestamp}.${body}`; if the timestamp is more
// than this far from now, treat it as forged before we touch DialStack.
// Mirrors DialStack.webhooks.constructEvent's default tolerance.
const SIGNATURE_TIMESTAMP_TOLERANCE_S = 300;

function parseSignatureTimestamp(header: string | null): number | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('t=')) {
      const ts = Number(trimmed.slice(2));
      return Number.isFinite(ts) ? ts : null;
    }
  }
  return null;
}

function isFreshTimestamp(header: string | null): boolean {
  const ts = parseSignatureTimestamp(header);
  if (ts === null) return false;
  const ageS = Math.abs(Math.floor(Date.now() / 1000) - ts);
  return ageS <= SIGNATURE_TIMESTAMP_TOLERANCE_S;
}

async function refreshSecret(accountId: string): Promise<string | null> {
  // Rate-limit refreshes per account so failed-sig attacks can't drive
  // DialStack call volume linearly.
  const now = Date.now();
  const locked = refreshLockedUntil.get(accountId) ?? 0;
  if (locked > now) {
    return secretCache.get(accountId)?.secret ?? null;
  }
  refreshLockedUntil.set(accountId, now + REFRESH_COOLDOWN_MS);

  try {
    const secret = await getPracticeAIAgentSecret(accountId);
    if (secret) {
      secretCache.set(accountId, { secret, fetchedAt: now });
    }
    return secret;
  } catch (err) {
    logger.error(
      { err: String(err), account_id: accountId },
      'Failed to resolve voice-app secret for inbound webhook'
    );
    return secretCache.get(accountId)?.secret ?? null;
  }
}

async function getSecret(accountId: string): Promise<string | null> {
  const cached = secretCache.get(accountId);
  if (cached) return cached.secret;
  return refreshSecret(accountId);
}

/**
 * Shared verification for inbound AI-agent tool-call webhooks.
 *
 * The managed ai-agent service signs each tool-call request with the
 * voice-app's HMAC secret. Look the practice up by `account_id`, resolve
 * the voice-app secret from DialStack on demand (memoized in-process), and
 * verify the signature. Returns either a typed event + practice, or a
 * NextResponse with the appropriate error body for the caller to return.
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

  const secret = await getSecret(parsed.account_id);
  if (!secret) {
    return unauthorized();
  }

  let event: T;
  try {
    event = DialStack.webhooks.constructEvent<T>(body, signature, secret);
  } catch (err) {
    // The cached secret may be stale (rotated upstream). Only refresh and
    // retry when the timestamp on the request is fresh — a stale timestamp
    // is the cheaper signal of forgery, and refreshing on it would let an
    // attacker drive provider-call volume.
    if (!isFreshTimestamp(signature)) {
      logger.error(
        { err: String(err), account_id: parsed.account_id, practice_id: practice.id },
        'Tool-call webhook signature verification failed (stale timestamp)'
      );
      return unauthorized();
    }
    const refreshed = await refreshSecret(parsed.account_id);
    if (refreshed && refreshed !== secret) {
      try {
        event = DialStack.webhooks.constructEvent<T>(body, signature, refreshed);
        return { event, practice };
      } catch {
        // fall through to unauthorized
      }
    }
    logger.error(
      { err: String(err), account_id: parsed.account_id, practice_id: practice.id },
      'Tool-call webhook signature verification failed'
    );
    return unauthorized();
  }

  return { event, practice };
}
