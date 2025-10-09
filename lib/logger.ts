import pino from "pino";

/**
 * Configured pino logger for structured JSON logging
 *
 * Outputs JSON logs in all environments for consistency and compatibility with log aggregation
 *
 * For human-readable logs in development, pipe through pino-pretty:
 *   npm run dev 2>&1 | npx pino-pretty
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Always output JSON (no transport/worker threads to avoid Next.js conflicts)
  // Base configuration for all logs
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || "unknown",
  },
  // Custom serializers for common objects
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export default logger;
