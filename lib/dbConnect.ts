import { Pool } from "pg";
import logger from "@/lib/logger";

let pool: Pool | null = null;

/**
 * RDS-managed secret format from AWS Secrets Manager
 */
interface RDSSecret {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

export default async function dbConnect(): Promise<Pool> {
  if (!pool) {
    const databaseSecret = process.env.DATABASE_SECRET;
    if (!databaseSecret) {
      throw new Error("DATABASE_SECRET environment variable is not set");
    }

    // Parse RDS-managed secret JSON and construct connection string
    const secret: RDSSecret = JSON.parse(databaseSecret);
    const connectionString = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}`;

    pool = new Pool({
      connectionString,
      // Connection pool configuration
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
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
