import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    publishableKey: process.env.DIALSTACK_PUBLIC_KEY,
  });
}
