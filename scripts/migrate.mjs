#!/usr/bin/env node

/**
 * Database migration runner script
 * Parses RDS-managed secret and runs node-pg-migrate
 */

import migrate from "node-pg-migrate";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: false,
    },
  },
});

async function runDatabaseMigrations() {
  try {
    // Parse RDS-managed secret
    const databaseSecret = process.env.DATABASE_SECRET;
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || "5432";
    const dbName = process.env.DB_NAME;

    if (!databaseSecret) {
      throw new Error("DATABASE_SECRET environment variable is not set");
    }
    if (!dbHost || !dbName) {
      throw new Error("DB_HOST and DB_NAME environment variables must be set");
    }

    // Parse RDS secret (contains username and password)
    let secret;
    try {
      secret = JSON.parse(databaseSecret);
    } catch (err) {
      throw new Error(`Failed to parse DATABASE_SECRET: ${err.message}`);
    }

    if (!secret.username || !secret.password) {
      throw new Error(
        "DATABASE_SECRET must contain username and password fields",
      );
    }

    // Construct database URL (encode username and password to handle special characters)
    const databaseUrl = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${dbHost}:${dbPort}/${dbName}`;

    logger.info(
      {
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: secret.username,
      },
      "Running database migrations",
    );

    // Run migrations
    const migrations = await migrate({
      databaseUrl,
      dir: "migrations",
      direction: "up",
      migrationsTable: "pgmigrations",
      verbose: true,
      log: (msg) => {
        logger.info(msg);
      },
    });

    if (migrations.length === 0) {
      logger.info("No new migrations to run - database is up to date");
    } else {
      logger.info(
        { migrations },
        `Successfully ran ${migrations.length} migration(s)`,
      );
    }

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Migration failed");
    process.exit(1);
  }
}

// Run migrations
runDatabaseMigrations();
