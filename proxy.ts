import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import logger from "./lib/logger";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Next.js proxy for request logging
 *
 * Logs all incoming requests with method, path, and duration
 * Similar to pino-http middleware in Express
 *
 * Access logs are disabled in development to reduce noise.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Skip access logs in development
  if (isDevelopment) {
    return response;
  }

  const startTime = Date.now();
  const { method, url, headers } = request;
  const pathname = new URL(url).pathname;

  // Log the request asynchronously (don't block the response)
  Promise.resolve().then(() => {
    const duration = Date.now() - startTime;

    logger.info({
      msg: `${method} ${pathname}`,
      method,
      path: pathname,
      duration_ms: duration.toString(),
      status_code: response.status.toString(),
      user_agent: headers.get("user-agent") || undefined,
      source_ip:
        headers.get("x-forwarded-for") || headers.get("x-real-ip") || undefined,
      request: {
        method,
        url: pathname,
        headers: {
          host: headers.get("host") || undefined,
          "user-agent": headers.get("user-agent") || undefined,
          accept: headers.get("accept") || undefined,
          "accept-language": headers.get("accept-language") || undefined,
          "accept-encoding": headers.get("accept-encoding") || undefined,
          connection: headers.get("connection") || undefined,
          "x-forwarded-for": headers.get("x-forwarded-for") || undefined,
          "x-forwarded-proto": headers.get("x-forwarded-proto") || undefined,
          "x-real-ip": headers.get("x-real-ip") || undefined,
        },
      },
      response: {
        statusCode: response.status.toString(),
        headers: {
          "content-type": response.headers.get("content-type") || undefined,
          "content-length": response.headers.get("content-length") || undefined,
        },
      },
    });
  });

  return response;
}

// Configure which routes the proxy runs on
export const config = {
  // Match all routes except static files and Next.js internals
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
