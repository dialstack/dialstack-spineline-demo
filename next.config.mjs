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
};

export default nextConfig;
