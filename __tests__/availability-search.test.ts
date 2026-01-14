import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { runner as migrate } from "node-pg-migrate";
import { generateAvailabilities } from "../lib/availability";

describe("Availability Search Algorithm", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  describe("Timezone Formatting", () => {
    it("should return 9am-5pm EST for full business day in Eastern timezone", () => {
      // Jan 15, 2026 (Thursday), 9am-5pm EST = 14:00-22:00 UTC
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-15T14:00:00Z"),
        new Date("2026-01-15T22:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-15T09:00:00-05:00", duration_minutes: 480 },
      ]);
    });

    it("should format times with Pacific timezone offset", () => {
      // Jan 15, 2026 (Thursday), 9am-5pm PST = 17:00-01:00 UTC
      const result = generateAvailabilities(
        "America/Los_Angeles",
        new Date("2026-01-15T17:00:00Z"),
        new Date("2026-01-16T01:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-15T09:00:00-08:00", duration_minutes: 480 },
      ]);
    });
  });

  describe("Weekend Handling", () => {
    it("should return empty array for weekend days", () => {
      // Jan 17-18, 2026 is Saturday-Sunday
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-17T14:00:00Z"),
        new Date("2026-01-18T22:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([]);
    });

    it("should return availability for Monday", () => {
      // Jan 19, 2026 is Monday
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-19T14:00:00Z"),
        new Date("2026-01-19T22:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-19T09:00:00-05:00", duration_minutes: 480 },
      ]);
    });
  });

  describe("Appointment Subtraction", () => {
    it("should split availability around an existing appointment", () => {
      // Appointment from 10am-11am EST (15:00-16:00 UTC)
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-15T14:00:00Z"),
        new Date("2026-01-15T22:00:00Z"),
        [
          {
            start_at: new Date("2026-01-15T15:00:00Z"),
            end_at: new Date("2026-01-15T16:00:00Z"),
            status: "accepted",
          },
        ],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-15T09:00:00-05:00", duration_minutes: 60 },
        { start_at: "2026-01-15T11:00:00-05:00", duration_minutes: 360 },
      ]);
    });

    it("should ignore cancelled appointments", () => {
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-15T14:00:00Z"),
        new Date("2026-01-15T22:00:00Z"),
        [
          {
            start_at: new Date("2026-01-15T15:00:00Z"),
            end_at: new Date("2026-01-15T16:00:00Z"),
            status: "cancelled",
          },
        ],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-15T09:00:00-05:00", duration_minutes: 480 },
      ]);
    });

    it("should ignore declined appointments", () => {
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-01-15T14:00:00Z"),
        new Date("2026-01-15T22:00:00Z"),
        [
          {
            start_at: new Date("2026-01-15T15:00:00Z"),
            end_at: new Date("2026-01-15T16:00:00Z"),
            status: "declined",
          },
        ],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-01-15T09:00:00-05:00", duration_minutes: 480 },
      ]);
    });
  });

  describe("DST Transitions", () => {
    it("should use EDT offset (-04:00) after spring forward", () => {
      // March 9, 2026 is Monday after DST starts
      // 9am EDT = 13:00 UTC, 5pm EDT = 21:00 UTC
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-03-09T13:00:00Z"),
        new Date("2026-03-09T21:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-03-09T09:00:00-04:00", duration_minutes: 480 },
      ]);
    });

    it("should use EST offset (-05:00) after fall back", () => {
      // November 2, 2026 is Monday after DST ends
      // 9am EST = 14:00 UTC, 5pm EST = 22:00 UTC
      const result = generateAvailabilities(
        "America/New_York",
        new Date("2026-11-02T14:00:00Z"),
        new Date("2026-11-02T22:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([
        { start_at: "2026-11-02T09:00:00-05:00", duration_minutes: 480 },
      ]);
    });
  });

  describe("Outside Business Hours", () => {
    it("should return empty array for evening hours", () => {
      // Jan 17, 2026 02:00-08:00 UTC = Fri 6pm - Sat midnight PST
      const result = generateAvailabilities(
        "America/Los_Angeles",
        new Date("2026-01-17T02:00:00Z"),
        new Date("2026-01-17T08:00:00Z"),
        [],
        now,
      );

      expect(result).toEqual([]);
    });
  });
});

describe("Database Integration", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });

    // Run migrations
    await migrate({
      databaseUrl: container.getConnectionUri(),
      dir: "migrations",
      direction: "up",
      migrationsTable: "pgmigrations",
      verbose: false,
      log: () => {},
    });
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    // Clean up test data between tests
    await pool.query("DELETE FROM appointments");
    await pool.query("DELETE FROM practices");
  });

  it("should store practice with timezone config", async () => {
    // Insert practice with config
    await pool.query(`
      INSERT INTO practices (email, password, config)
      VALUES ('test@example.com', 'hashedpw', '{"timezone": "America/Los_Angeles"}')
    `);

    const result = await pool.query(
      "SELECT config FROM practices WHERE email = 'test@example.com'",
    );

    expect(result.rows[0].config).toEqual({ timezone: "America/Los_Angeles" });
  });

  it("should default timezone to America/New_York", async () => {
    // Insert practice without specifying config (uses default)
    await pool.query(`
      INSERT INTO practices (email, password)
      VALUES ('default@example.com', 'hashedpw')
    `);

    const result = await pool.query(
      "SELECT config FROM practices WHERE email = 'default@example.com'",
    );

    expect(result.rows[0].config).toEqual({ timezone: "America/New_York" });
  });

  it("should query appointments for availability calculation", async () => {
    // Create practice
    const practiceResult = await pool.query(`
      INSERT INTO practices (email, password, config)
      VALUES ('practice@example.com', 'hashedpw', '{"timezone": "America/New_York"}')
      RETURNING id
    `);
    const practiceId = practiceResult.rows[0].id;

    // Create appointment
    await pool.query(
      `
      INSERT INTO appointments (practice_id, start_at, end_at, status, type)
      VALUES ($1, '2026-01-15T15:00:00Z', '2026-01-15T16:00:00Z', 'accepted', 'adjustment')
    `,
      [practiceId],
    );

    // Query appointments in range
    const appointments = await pool.query(
      `
      SELECT start_at, end_at, status
      FROM appointments
      WHERE practice_id = $1
        AND start_at >= $2
        AND start_at < $3
    `,
      [practiceId, "2026-01-15T00:00:00Z", "2026-01-16T00:00:00Z"],
    );

    expect(appointments.rows).toHaveLength(1);
    expect(appointments.rows[0].status).toBe("accepted");
  });
});
