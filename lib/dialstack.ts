import { DialStack, DialStackNotFoundError } from '@dialstack/sdk/server';

// Lazy initialization to avoid build-time errors when env vars aren't set
let _dialstack: DialStack | null = null;
let _sandboxDialstack: DialStack | null = null;

// Cache: accountId -> 'live' | 'sandbox'
const accountModeCache = new Map<string, 'live' | 'sandbox'>();

export function getDialstack(): DialStack {
  if (!_dialstack) {
    _dialstack = new DialStack(process.env.DIALSTACK_SECRET_KEY, {
      apiUrl: process.env.DIALSTACK_API_URL,
    });
  }
  return _dialstack;
}

function getSandboxDialstack(): DialStack | null {
  const key = process.env.DIALSTACK_SANDBOX_SECRET_KEY;
  if (!key || !key.startsWith('sk_test_')) {
    return null;
  }
  if (!_sandboxDialstack) {
    _sandboxDialstack = new DialStack(process.env.DIALSTACK_SANDBOX_SECRET_KEY, {
      apiUrl: process.env.DIALSTACK_API_URL,
    });
  }
  return _sandboxDialstack;
}

/**
 * Returns the correct DialStack client (live or sandbox) for a given account.
 * Probes the live client first; on 404, falls back to the sandbox client.
 * Results are cached in-memory for the lifetime of the process.
 */
export async function getDialstackForAccount(accountId: string): Promise<DialStack> {
  const live = getDialstack();
  const cached = accountModeCache.get(accountId);

  if (cached === 'live') return live;
  if (cached === 'sandbox') return getSandboxDialstack()!;

  // Probe live client
  try {
    await live.accounts.retrieve(accountId);
    accountModeCache.set(accountId, 'live');
    return live;
  } catch (error) {
    if (!(error instanceof DialStackNotFoundError)) {
      throw error;
    }

    // Account not found on live — try sandbox
    const sandbox = getSandboxDialstack();
    if (!sandbox) {
      throw error;
    }

    try {
      await sandbox.accounts.retrieve(accountId);
      accountModeCache.set(accountId, 'sandbox');
      return sandbox;
    } catch (sandboxError) {
      if (sandboxError instanceof DialStackNotFoundError) {
        // Account not found on either client — throw the original live error
        throw error;
      }
      // Sandbox client failed for a non-404 reason (auth, network, etc.) — surface it
      throw sandboxError;
    }
  }
}
