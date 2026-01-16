/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Configure Turbopack root for npm workspaces
  // This tells Next.js where to resolve packages from when building in a monorepo
  turbopack: {
    root: '..',
  },
};

export default nextConfig;
