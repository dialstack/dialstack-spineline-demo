import pino from "pino";

/**
 * Configured pino logger for structured JSON logging
 *
 * In production, outputs JSON logs that can be parsed by Fluent Bit
 * In development, uses pino-pretty for human-readable output
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // In production, output JSON for log aggregation
  // In development, use pretty printing
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
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
