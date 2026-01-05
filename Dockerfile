# syntax=docker/dockerfile:1

# Multi-stage Docker build for Next.js 15 production deployment
# Uses standalone output for smaller, more cacheable layers
#
# Layer optimization: Dependencies are split into two stages so that
# frequent @dialstack/sdk updates don't invalidate the large stable deps layer.

# Stage 1a: Install stable dependencies (rarely changes)
FROM node:24-alpine AS deps-stable
WORKDIR /app
COPY spineline/package.json spineline/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    apk add --no-cache jq=1.8.1-r0 && \
    jq 'del(.dependencies["@dialstack/sdk"])' package.json > package-stable.json && \
    mv package-stable.json package.json && \
    npm ci --ignore-scripts

# Stage 1b: Add @dialstack/sdk (changes more frequently)
FROM deps-stable AS deps
COPY spineline/package.json spineline/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build application
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY spineline/package.json spineline/package-lock.json ./

# Copy config files (these change less frequently)
COPY spineline/next.config.mjs ./
COPY spineline/tailwind.config.js spineline/postcss.config.js spineline/tsconfig.json spineline/components.json ./

# Copy source code (ordered by change frequency - least to most)
COPY spineline/public/ ./public/
COPY spineline/migrations/ ./migrations/
COPY spineline/scripts/ ./scripts/
COPY spineline/types/ ./types/
COPY spineline/lib/ ./lib/
COPY spineline/components/ ./components/
COPY spineline/middleware.ts ./
COPY spineline/app/ ./app/

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:24-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install migration dependencies (stable layer)
# These are runtime deps not in the standalone build
# hadolint ignore=DL3016
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save node-pg-migrate@8 pg@8 pino@10 pino-pretty@13

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

# Start standalone server (migrations run separately via ECS task)
CMD ["node", "server.js"]
