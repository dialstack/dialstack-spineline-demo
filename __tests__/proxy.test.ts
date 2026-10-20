import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

function request(urlPath: string, method: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(urlPath, 'http://localhost'), { method, headers });
}

describe('proxy', () => {
  it.each([
    ['a forged Server Action', '/home', { 'next-action': 'cachefn' }],
    ['a no-JS form action', '/login', { 'content-type': 'multipart/form-data; boundary=x' }],
    ['a POST to a path no route serves', '/api', {}],
  ])('answers %s with 405', (_, urlPath, headers) => {
    const res = proxy(request(urlPath, 'POST', headers));

    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });

  it.each(['PUT', 'DELETE', 'OPTIONS'])('answers %s on a page with 405', (method) => {
    expect(proxy(request('/patients', method)).status).toBe(405);
  });

  it.each([
    ['a page load', '/home', 'GET'],
    ['a HEAD request', '/login', 'HEAD'],
    ['an API call', '/api/patients', 'POST'],
    ['an API delete', '/api/patients/pat_123', 'DELETE'],
  ])('passes %s through', (_, urlPath, method) => {
    const res = proxy(request(urlPath, method));

    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  // A Server Action POSTs to a page, which the proxy refuses.
  it('has no Server Actions to refuse', () => {
    const root = path.resolve(__dirname, '..');
    const skip = new Set(['node_modules', '.next', 'mobile', '__tests__']);
    const sources = readdirSync(root, { recursive: true, encoding: 'utf8' })
      .filter((file) => !skip.has(file.split(path.sep)[0]))
      .filter((file) => /\.m?[jt]sx?$/.test(file));

    expect(sources).toContain('proxy.ts');
    for (const file of sources) {
      expect(readFileSync(path.join(root, file), 'utf8'), file).not.toMatch(
        /^\s*['"]use server['"]/m
      );
    }
  });
});
