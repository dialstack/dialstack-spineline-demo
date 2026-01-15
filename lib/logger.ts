import pino from 'pino';

/**
 * Configured pino logger for structured JSON logging
 *
 * Development logs are piped through pino-pretty via npm script.
 * Production outputs JSON for log aggregation systems.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    hostname: process.env.HOSTNAME || 'unknown',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export default logger;
