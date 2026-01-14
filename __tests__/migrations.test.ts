import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { runner as migrate } from "node-pg-migrate";

describe("Database Migrations", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withExposedPorts(5432)
      .start();

    // Create connection pool
    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });
  });

  afterAll(async () => {
    // Cleanup
    await pool?.end();
    await container?.stop();
  });

  it("should run migrations successfully", async () => {
    // Run migrations
    const migrations = await migrate({
      databaseUrl: container.getConnectionUri(),
      dir: "migrations",
      direction: "up",
      migrationsTable: "pgmigrations",
      verbose: false,
      log: () => {},
    });

    // Verify at least one migration ran
    expect(migrations.length).toBeGreaterThan(0);
  });

  it("should create pgmigrations table", async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pgmigrations'
      );
    `);

    expect(result.rows[0].exists).toBe(true);
  });

  it("should create practices table with correct schema", async () => {
    // Check table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'practices'
      );
    `);
    expect(tableExists.rows[0].exists).toBe(true);

    // Check columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'practices'
      ORDER BY ordinal_position;
    `);

    const columnMap = new Map(
      columns.rows.map((row) => [row.column_name, row]),
    );

    // Verify required columns exist
    expect(columnMap.has("id")).toBe(true);
    expect(columnMap.has("email")).toBe(true);
    expect(columnMap.has("password")).toBe(true);
    expect(columnMap.has("created_at")).toBe(true);
    expect(columnMap.has("updated_at")).toBe(true);

    // Verify column types
    expect(columnMap.get("id")?.data_type).toBe("integer");
    expect(columnMap.get("email")?.data_type).toBe("character varying");
    expect(columnMap.get("password")?.data_type).toBe("character varying");
    expect(columnMap.get("created_at")?.data_type).toContain("timestamp");
    expect(columnMap.get("updated_at")?.data_type).toContain("timestamp");

    // Verify NOT NULL constraints
    expect(columnMap.get("email")?.is_nullable).toBe("NO");
    expect(columnMap.get("password")?.is_nullable).toBe("NO");
    expect(columnMap.get("created_at")?.is_nullable).toBe("NO");
    expect(columnMap.get("updated_at")?.is_nullable).toBe("NO");
  });

  it("should create email unique constraint", async () => {
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'practices'
      AND constraint_type = 'UNIQUE';
    `);

    expect(constraints.rows.length).toBeGreaterThan(0);
    expect(
      constraints.rows.some((row) => row.constraint_name.includes("email")),
    ).toBe(true);
  });

  it("should create indexes", async () => {
    const indexes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'practices';
    `);

    const indexNames = indexes.rows.map((row) => row.indexname);

    // Should have indexes for email and created_at
    expect(indexNames.some((name) => name.includes("email"))).toBe(true);
    expect(indexNames.some((name) => name.includes("created_at"))).toBe(true);
  });

  it("should create update_updated_at_column function", async () => {
    const functions = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'update_updated_at_column';
    `);

    expect(functions.rows.length).toBe(1);
  });

  it("should create trigger for updated_at", async () => {
    const triggers = await pool.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table = 'practices'
      AND trigger_name = 'update_practices_updated_at';
    `);

    expect(triggers.rows.length).toBe(1);
  });

  it("should create config JSONB column with timezone default", async () => {
    // Check config column exists with correct type
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'practices'
      AND column_name = 'config';
    `);

    expect(columns.rows).toHaveLength(1);
    expect(columns.rows[0].data_type).toBe("jsonb");
    expect(columns.rows[0].is_nullable).toBe("NO");
    expect(columns.rows[0].column_default).toContain("America/New_York");
  });

  it("should automatically update updated_at on row update", async () => {
    // Insert a test row
    const insertResult = await pool.query(
      `
      INSERT INTO practices (email, password, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, created_at, updated_at;
    `,
      ["test@example.com", "hashedpassword"],
    );

    const originalUpdatedAt = insertResult.rows[0].updated_at;
    const practiceId = insertResult.rows[0].id;

    // Wait a moment to ensure timestamp will be different
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update the row
    await pool.query(
      `
      UPDATE practices
      SET password = $1
      WHERE id = $2;
    `,
      ["newhashedpassword", practiceId],
    );

    // Check that updated_at changed
    const selectResult = await pool.query(
      `
      SELECT updated_at
      FROM practices
      WHERE id = $1;
    `,
      [practiceId],
    );

    const newUpdatedAt = selectResult.rows[0].updated_at;

    expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime(),
    );
  });
});
