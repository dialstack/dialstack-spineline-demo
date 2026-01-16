import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runner as migrate } from 'node-pg-migrate';
import {
  generateAvailabilities,
  unionAvailabilitySlots,
  AvailabilitySlot,
} from '../lib/availability';

describe('Availability Search Algorithm', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  describe('Timezone Formatting', () => {
    it('should return 9am-5pm EST for full business day in Eastern timezone', () => {
      // Jan 15, 2026 (Thursday), 9am-5pm EST = 14:00-22:00 UTC
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T14:00:00Z'),
        new Date('2026-01-15T22:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });

    it('should format times with Pacific timezone offset', () => {
      // Jan 15, 2026 (Thursday), 9am-5pm PST = 17:00-01:00 UTC
      const result = generateAvailabilities(
        'America/Los_Angeles',
        new Date('2026-01-15T17:00:00Z'),
        new Date('2026-01-16T01:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-08:00', duration_minutes: 480 }]);
    });
  });

  describe('Weekend Handling', () => {
    it('should return empty array for weekend days', () => {
      // Jan 17-18, 2026 is Saturday-Sunday
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-17T14:00:00Z'),
        new Date('2026-01-18T22:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([]);
    });

    it('should return availability for Monday', () => {
      // Jan 19, 2026 is Monday
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-19T14:00:00Z'),
        new Date('2026-01-19T22:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-19T09:00:00-05:00', duration_minutes: 480 }]);
    });
  });

  describe('Appointment Subtraction', () => {
    it('should split availability around an existing appointment', () => {
      // Appointment from 10am-11am EST (15:00-16:00 UTC)
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T14:00:00Z'),
        new Date('2026-01-15T22:00:00Z'),
        [
          {
            start_at: new Date('2026-01-15T15:00:00Z'),
            end_at: new Date('2026-01-15T16:00:00Z'),
            status: 'accepted',
          },
        ],
        now
      );

      expect(result).toEqual([
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 60 },
        { start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 360 },
      ]);
    });

    it('should ignore cancelled appointments', () => {
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T14:00:00Z'),
        new Date('2026-01-15T22:00:00Z'),
        [
          {
            start_at: new Date('2026-01-15T15:00:00Z'),
            end_at: new Date('2026-01-15T16:00:00Z'),
            status: 'cancelled',
          },
        ],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });

    it('should ignore declined appointments', () => {
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T14:00:00Z'),
        new Date('2026-01-15T22:00:00Z'),
        [
          {
            start_at: new Date('2026-01-15T15:00:00Z'),
            end_at: new Date('2026-01-15T16:00:00Z'),
            status: 'declined',
          },
        ],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });
  });

  describe('DST Transitions', () => {
    it('should use EDT offset (-04:00) after spring forward', () => {
      // March 9, 2026 is Monday after DST starts
      // 9am EDT = 13:00 UTC, 5pm EDT = 21:00 UTC
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-03-09T13:00:00Z'),
        new Date('2026-03-09T21:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-03-09T09:00:00-04:00', duration_minutes: 480 }]);
    });

    it('should use EST offset (-05:00) after fall back', () => {
      // November 2, 2026 is Monday after DST ends
      // 9am EST = 14:00 UTC, 5pm EST = 22:00 UTC
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-11-02T14:00:00Z'),
        new Date('2026-11-02T22:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-11-02T09:00:00-05:00', duration_minutes: 480 }]);
    });
  });

  describe('Range Boundary Clipping', () => {
    it('should clip availability to query range (user reported bug)', () => {
      // User's exact query: 2026-01-14T09:00:00Z to 2026-01-15T17:00:00Z
      // In EST: 4am Jan 14 to 12pm Jan 15
      // Business hours: 9am-5pm EST
      // Expected: Jan 14 should be clipped to start at 9am EST (business open, after 4am query start)
      //           Jan 15 should be clipped to end at 12pm EST (query end, before 5pm business close)
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-14T09:00:00Z'), // 4am EST
        new Date('2026-01-15T17:00:00Z'), // 12pm EST next day
        [],
        new Date('2026-01-14T09:00:00Z') // now = rangeStart
      );

      // Jan 14: 9am-5pm EST = 480 min (business hours, query starts before business opens)
      // Jan 15: 9am-12pm EST = 180 min (business open to query end)
      expect(result).toEqual([
        { start_at: '2026-01-14T09:00:00-05:00', duration_minutes: 480 },
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 180 },
      ]);

      // Verify: availability start (9am EST = 14:00 UTC) is AFTER query start (9am UTC)
      const queryStartUtc = new Date('2026-01-14T09:00:00Z').getTime();
      const availStartUtc = new Date('2026-01-14T14:00:00Z').getTime(); // 9am EST in UTC
      expect(availStartUtc).toBeGreaterThan(queryStartUtc);
    });

    it('should clip availability start to rangeStart when business hours start earlier', () => {
      // Query range starts at 11am EST (16:00 UTC), but business opens at 9am EST
      // The availability should start at 11am EST (the query start), not 9am EST
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T16:00:00Z'), // 11am EST
        new Date('2026-01-15T22:00:00Z'), // 5pm EST
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 360 }]);
    });

    it('should clip availability end to rangeEnd when business hours end later', () => {
      // Query range ends at 2pm EST (19:00 UTC), but business closes at 5pm EST
      // The availability should end at 2pm EST (the query end), not 5pm EST
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T14:00:00Z'), // 9am EST
        new Date('2026-01-15T19:00:00Z'), // 2pm EST
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 300 }]);
    });

    it('should clip both start and end when range is narrower than business hours', () => {
      // Query range is 11am-2pm EST, business hours are 9am-5pm EST
      // Availability should be exactly 11am-2pm EST (180 minutes)
      const result = generateAvailabilities(
        'America/New_York',
        new Date('2026-01-15T16:00:00Z'), // 11am EST
        new Date('2026-01-15T19:00:00Z'), // 2pm EST
        [],
        now
      );

      expect(result).toEqual([{ start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 180 }]);
    });
  });

  describe('Outside Business Hours', () => {
    it('should return empty array for evening hours', () => {
      // Jan 17, 2026 02:00-08:00 UTC = Fri 6pm - Sat midnight PST
      const result = generateAvailabilities(
        'America/Los_Angeles',
        new Date('2026-01-17T02:00:00Z'),
        new Date('2026-01-17T08:00:00Z'),
        [],
        now
      );

      expect(result).toEqual([]);
    });
  });

  describe('Multi-Provider Availability', () => {
    it('should show full availability when one provider is free all day', () => {
      // Provider A blocked 10-11am, Provider B blocked 11am-12pm, Provider C free all day
      // Expected: Full 9am-5pm (C is always available)
      const timezone = 'America/New_York';
      const rangeStart = new Date('2026-01-15T14:00:00Z'); // 9am EST
      const rangeEnd = new Date('2026-01-15T22:00:00Z'); // 5pm EST

      // Generate availability for each provider
      const providerASlots = generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        [
          {
            start_at: new Date('2026-01-15T15:00:00Z'), // 10am EST
            end_at: new Date('2026-01-15T16:00:00Z'), // 11am EST
            status: 'accepted',
          },
        ],
        now
      );

      const providerBSlots = generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        [
          {
            start_at: new Date('2026-01-15T16:00:00Z'), // 11am EST
            end_at: new Date('2026-01-15T17:00:00Z'), // 12pm EST
            status: 'accepted',
          },
        ],
        now
      );

      const providerCSlots = generateAvailabilities(timezone, rangeStart, rangeEnd, [], now);

      // Union all provider availabilities
      const result = unionAvailabilitySlots([providerASlots, providerBSlots, providerCSlots]);

      // Should be full 9am-5pm since Provider C is always available
      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });

    it('should show partial availability when all providers blocked same time', () => {
      // All 3 providers blocked 10-11am
      // Expected: 9-10am and 11am-5pm windows
      const timezone = 'America/New_York';
      const rangeStart = new Date('2026-01-15T14:00:00Z'); // 9am EST
      const rangeEnd = new Date('2026-01-15T22:00:00Z'); // 5pm EST

      const blockedAppointment = {
        start_at: new Date('2026-01-15T15:00:00Z'), // 10am EST
        end_at: new Date('2026-01-15T16:00:00Z'), // 11am EST
        status: 'accepted',
      };

      const providerASlots = generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        [blockedAppointment],
        now
      );
      const providerBSlots = generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        [blockedAppointment],
        now
      );
      const providerCSlots = generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        [blockedAppointment],
        now
      );

      const result = unionAvailabilitySlots([providerASlots, providerBSlots, providerCSlots]);

      // All providers blocked 10-11am, so availability is 9-10am and 11am-5pm
      expect(result).toEqual([
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 60 },
        { start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 360 },
      ]);
    });

    it('should merge adjacent availability slots from different providers', () => {
      // Provider A: 9am-11am, Provider B: 11am-1pm, Provider C: 1pm-5pm
      // Union should merge into continuous 9am-5pm
      const timezone = 'America/New_York';

      const providerASlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 120 },
      ];
      const providerBSlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 120 },
      ];
      const providerCSlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T13:00:00-05:00', duration_minutes: 240 },
      ];

      const result = unionAvailabilitySlots([providerASlots, providerBSlots, providerCSlots]);

      // Adjacent/overlapping slots should merge into one continuous slot
      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });

    it('should handle overlapping availability slots', () => {
      // Provider A: 9am-2pm, Provider B: 11am-5pm
      // Union should be 9am-5pm
      const providerASlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 300 }, // 9am-2pm
      ];
      const providerBSlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T11:00:00-05:00', duration_minutes: 360 }, // 11am-5pm
      ];

      const result = unionAvailabilitySlots([providerASlots, providerBSlots]);

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });

    it('should return empty array when all providers have empty availability', () => {
      const result = unionAvailabilitySlots([[], [], []]);
      expect(result).toEqual([]);
    });

    it('should handle single provider slots', () => {
      const providerSlots: AvailabilitySlot[] = [
        { start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 },
      ];

      const result = unionAvailabilitySlots([providerSlots]);

      expect(result).toEqual([{ start_at: '2026-01-15T09:00:00-05:00', duration_minutes: 480 }]);
    });
  });
});

describe('Database Integration', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').withExposedPorts(5432).start();

    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });

    // Run migrations
    await migrate({
      databaseUrl: container.getConnectionUri(),
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
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
    await pool.query('DELETE FROM appointments');
    await pool.query('DELETE FROM practices');
  });

  it('should store practice with timezone config', async () => {
    // Insert practice with config
    await pool.query(`
      INSERT INTO practices (email, password, config)
      VALUES ('test@example.com', 'hashedpw', '{"timezone": "America/Los_Angeles"}')
    `);

    const result = await pool.query(
      "SELECT config FROM practices WHERE email = 'test@example.com'"
    );

    expect(result.rows[0].config).toEqual({ timezone: 'America/Los_Angeles' });
  });

  it('should default timezone to America/New_York', async () => {
    // Insert practice without specifying config (uses default)
    await pool.query(`
      INSERT INTO practices (email, password)
      VALUES ('default@example.com', 'hashedpw')
    `);

    const result = await pool.query(
      "SELECT config FROM practices WHERE email = 'default@example.com'"
    );

    expect(result.rows[0].config).toEqual({ timezone: 'America/New_York' });
  });

  it('should query appointments for availability calculation', async () => {
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
      [practiceId]
    );

    // Query appointments in range using overlap detection
    const appointments = await pool.query(
      `
      SELECT start_at, end_at, status
      FROM appointments
      WHERE practice_id = $1
        AND start_at < $3
        AND end_at > $2
    `,
      [practiceId, '2026-01-15T00:00:00Z', '2026-01-16T00:00:00Z']
    );

    expect(appointments.rows).toHaveLength(1);
    expect(appointments.rows[0].status).toBe('accepted');
  });

  it('should find appointments that start before range but overlap it', async () => {
    // Create practice
    const practiceResult = await pool.query(`
      INSERT INTO practices (email, password, config)
      VALUES ('overlap-test@example.com', 'hashedpw', '{"timezone": "America/New_York"}')
      RETURNING id
    `);
    const practiceId = practiceResult.rows[0].id;

    // Create appointment that starts BEFORE range but ENDS during range
    // Appointment: 8am-10am EST (13:00-15:00 UTC)
    await pool.query(
      `INSERT INTO appointments (practice_id, start_at, end_at, status, type)
       VALUES ($1, '2026-01-15T13:00:00Z', '2026-01-15T15:00:00Z', 'accepted', 'adjustment')`,
      [practiceId]
    );

    // Query range: 9am-5pm EST (14:00-22:00 UTC) - starts AFTER appointment begins
    // Using overlap detection: start_at < rangeEnd AND end_at > rangeStart
    const appointments = await pool.query(
      `SELECT start_at, end_at, status FROM appointments
       WHERE practice_id = $1 AND start_at < $3 AND end_at > $2`,
      [practiceId, '2026-01-15T14:00:00Z', '2026-01-15T22:00:00Z']
    );

    // Should find the overlapping appointment
    expect(appointments.rows).toHaveLength(1);
  });
});
