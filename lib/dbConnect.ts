import { Pool } from "pg";
import logger from "@/lib/logger";

let pool: Pool | null = null;

export default async function dbConnect(): Promise<Pool> {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
