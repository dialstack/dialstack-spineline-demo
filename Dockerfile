# syntax=docker/dockerfile:1

# Multi-stage Docker build for Next.js 15 production deployment
# Uses standalone output for smaller, more cacheable layers

# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build application
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy config files (these change less frequently)
COPY next.config.mjs ./
COPY tailwind.config.js postcss.config.js tsconfig.json components.json ./

# Copy source code (ordered by change frequency - least to most)
COPY public/ ./public/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/
COPY types/ ./types/
COPY lib/ ./lib/
COPY components/ ./components/
COPY app/ ./app/

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:24-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install migration dependencies first (stable layer - only changes if deps change)
# Copy package.json from deps stage (not builder) so this layer is stable
# Use BuildKit cache mount to speed up npm install
COPY --from=deps /app/package.json ./package.json
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save node-pg-migrate pg pino pino-pretty

# Copy standalone build (includes only necessary node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (separate layer for better caching)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public files (rarely changes)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy migrations and scripts for database initialization
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start standalone server
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
