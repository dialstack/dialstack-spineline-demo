# Multi-stage Docker build for Next.js 15 production deployment

# Stage 1: Dependencies installation
FROM node:24-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build application
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY app/ ./app/
COPY components/ ./components/
COPY lib/ ./lib/
COPY types/ ./types/
COPY public/ ./public/
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY components.json ./
COPY eslint.config.mjs ./

# Build application for production
# Disable telemetry for production builds
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy Next.js configuration files if they exist
COPY --from=builder /app/next.config* ./

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["npm", "start"]
