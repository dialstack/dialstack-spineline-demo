import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialStackNotFoundError, DialStackAuthenticationError } from '@dialstack/sdk/server';

// Mock the SDK — we control what accounts.retrieve() returns
const mockLiveRetrieve = vi.fn();
const mockSandboxRetrieve = vi.fn();

let constructorCallCount = 0;

vi.mock('@dialstack/sdk/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dialstack/sdk/server')>();
  return {
    ...actual,
    DialStack: class MockDialStack {
      accounts: { retrieve: typeof mockLiveRetrieve };
      constructor() {
        constructorCallCount++;
        // First instantiation = live client, second = sandbox
        const retrieve = constructorCallCount === 1 ? mockLiveRetrieve : mockSandboxRetrieve;
        this.accounts = { retrieve };
      }
    },
  };
});

function makeNotFoundError(): DialStackNotFoundError {
  return new DialStackNotFoundError('Not found', {
    statusCode: 404,
    type: 'not_found_error',
    raw: { type: 'not_found_error', message: 'Not found' },
  });
}

function makeAuthError(): DialStackAuthenticationError {
  return new DialStackAuthenticationError('Invalid API key', {
    statusCode: 401,
    type: 'authentication_error',
    raw: { type: 'authentication_error', message: 'Invalid API key' },
  });
}

describe('getDialstackForAccount', () => {
  beforeEach(() => {
    vi.resetModules();
    constructorCallCount = 0;
    mockLiveRetrieve.mockReset();
    mockSandboxRetrieve.mockReset();
    // Set valid keys so both clients are created
    process.env.DIALSTACK_SECRET_KEY = 'sk_live_test';
    process.env.DIALSTACK_SANDBOX_SECRET_KEY = 'sk_test_sandbox';
  });

  it('returns live client when account is found on live', async () => {
    mockLiveRetrieve.mockResolvedValueOnce({ id: 'acct_123' });
    const { getDialstackForAccount } = await import('../lib/dialstack');

    const client = await getDialstackForAccount('acct_123');
    expect(mockLiveRetrieve).toHaveBeenCalledWith('acct_123');
    expect(mockSandboxRetrieve).not.toHaveBeenCalled();
    expect(client.accounts.retrieve).toBe(mockLiveRetrieve);
  });

  it('falls back to sandbox client when live returns 404', async () => {
    mockLiveRetrieve.mockRejectedValueOnce(makeNotFoundError());
    mockSandboxRetrieve.mockResolvedValueOnce({ id: 'acct_123' });
    const { getDialstackForAccount } = await import('../lib/dialstack');

    const client = await getDialstackForAccount('acct_123');
    expect(mockLiveRetrieve).toHaveBeenCalledWith('acct_123');
    expect(mockSandboxRetrieve).toHaveBeenCalledWith('acct_123');
    expect(client.accounts.retrieve).toBe(mockSandboxRetrieve);
  });

  it('throws original 404 when both live and sandbox return 404', async () => {
    mockLiveRetrieve.mockRejectedValueOnce(makeNotFoundError());
    mockSandboxRetrieve.mockRejectedValueOnce(makeNotFoundError());
    const { getDialstackForAccount } = await import('../lib/dialstack');

    await expect(getDialstackForAccount('acct_123')).rejects.toThrow(DialStackNotFoundError);
  });

  it('surfaces sandbox auth errors instead of masking as 404', async () => {
    mockLiveRetrieve.mockRejectedValueOnce(makeNotFoundError());
    mockSandboxRetrieve.mockRejectedValueOnce(makeAuthError());
    const { getDialstackForAccount } = await import('../lib/dialstack');

    await expect(getDialstackForAccount('acct_123')).rejects.toThrow(DialStackAuthenticationError);
  });

  it('throws non-404 live errors immediately without trying sandbox', async () => {
    mockLiveRetrieve.mockRejectedValueOnce(makeAuthError());
    const { getDialstackForAccount } = await import('../lib/dialstack');

    await expect(getDialstackForAccount('acct_123')).rejects.toThrow(DialStackAuthenticationError);
    expect(mockSandboxRetrieve).not.toHaveBeenCalled();
  });

  it('throws live 404 when sandbox key is not configured', async () => {
    delete process.env.DIALSTACK_SANDBOX_SECRET_KEY;
    mockLiveRetrieve.mockRejectedValueOnce(makeNotFoundError());
    const { getDialstackForAccount } = await import('../lib/dialstack');

    await expect(getDialstackForAccount('acct_123')).rejects.toThrow(DialStackNotFoundError);
    expect(mockSandboxRetrieve).not.toHaveBeenCalled();
  });

  it('ignores placeholder sandbox key value', async () => {
    process.env.DIALSTACK_SANDBOX_SECRET_KEY = 'not-configured';
    mockLiveRetrieve.mockRejectedValueOnce(makeNotFoundError());
    const { getDialstackForAccount } = await import('../lib/dialstack');

    await expect(getDialstackForAccount('acct_123')).rejects.toThrow(DialStackNotFoundError);
    expect(mockSandboxRetrieve).not.toHaveBeenCalled();
  });
});
