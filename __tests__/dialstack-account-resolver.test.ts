import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRetrieve = vi.fn();

vi.mock('@dialstack/sdk/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dialstack/sdk/server')>();
  return {
    ...actual,
    DialStack: class MockDialStack {
      accounts = { retrieve: mockRetrieve };
    },
  };
});

describe('getDialstack', () => {
  beforeEach(() => {
    vi.resetModules();
    mockRetrieve.mockReset();
    process.env.DIALSTACK_SECRET_KEY = 'sk_live_test';
  });

  it('returns a singleton client without probing the API', async () => {
    const { getDialstack } = await import('../lib/dialstack');

    const client1 = getDialstack();
    const client2 = getDialstack();
    expect(client1).toBe(client2);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });
});
