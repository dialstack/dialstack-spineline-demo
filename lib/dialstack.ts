import { DialStack } from '@dialstack/sdk/server';

// Lazy initialization to avoid build-time errors when env vars aren't set
let _dialstack: DialStack | null = null;

export function getDialstack(): DialStack {
  if (!_dialstack) {
    _dialstack = new DialStack(process.env.DIALSTACK_SECRET_KEY, {
      apiUrl: process.env.DIALSTACK_API_URL,
    });
  }
  return _dialstack;
}
