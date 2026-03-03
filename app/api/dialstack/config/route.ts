import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    publishableKey: process.env.DIALSTACK_PUBLIC_KEY,
    // Client-side SDK API URL (browser calls). Falls back to server-side URL.
    apiUrl: process.env.NEXT_PUBLIC_DIALSTACK_API_URL || process.env.DIALSTACK_API_URL,
  });
}
