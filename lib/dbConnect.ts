import { Pool } from "pg";
import logger from "@/lib/logger";

let pool: Pool | null = null;

/**
 * RDS-managed secret format from AWS Secrets Manager
 * Only contains username and password - host/port/dbname come from environment variables
 */
interface RDSSecret {
  username: string;
  password: string;
}

export default async function dbConnect(): Promise<Pool> {
  if (!pool) {
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

    // Parse RDS-managed secret JSON (contains only username and password)
    const secret: RDSSecret = JSON.parse(databaseSecret);
    // Encode username and password to handle special characters
    const connectionString = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${dbHost}:${dbPort}/${dbName}`;

    pool = new Pool({
      connectionString,
      // Connection pool configuration
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      // SSL configuration for RDS
      ssl: {
        rejectUnauthorized: false, // RDS certificates are valid but may not be in system trust store
      },
    });

    // Handle pool errors
    pool.on("error", (err) => {
      logger.error({ err }, "Unexpected error on idle client");
    });
  }

  return pool;
}

// Graceful shutdown function
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
