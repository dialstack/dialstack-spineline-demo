// Local dev: proxy /v1/* and /bff/v1/* to the Go API so the client-side SDK
// can reach it without CORS issues. The ports depend on the dev slot assignment
// (e.g. slot 1 uses 3001 for Next.js and 8090 for the Go API).
// In production the SDK talks to the API domain directly, so this is skipped —
// Next.js bakes rewrites at build time, and DIALSTACK_API_URL isn't available
// during the Docker build anyway.
function devRewrites() {
  if (process.env.NODE_ENV === 'production') return undefined;

  const apiUrl = (process.env.DIALSTACK_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

  return async () => ({
    beforeFiles: [],
    afterFiles: [
      { source: '/v1/:path*', destination: `${apiUrl}/v1/:path*` },
      { source: '/bff/v1/:path*', destination: `${apiUrl}/bff/v1/:path*` },
    ],
    fallback: [],
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Configure Turbopack root for npm workspaces
  // This tells Next.js where to resolve packages from when building in a monorepo
  turbopack: {
    root: '..',
  },
  // Explicitly mark pg as external to avoid Turbopack hashing issues
  // pg uses native bindings and must be resolved at runtime
  serverExternalPackages: ['pg'],
  ...(process.env.NODE_ENV !== 'production' ? { rewrites: devRewrites() } : {}),
};

export default nextConfig;
