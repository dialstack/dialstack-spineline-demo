import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runner as migrate } from 'node-pg-migrate';
import { formatProviderNotes } from '../lib/provider-utils';

describe('Booking Creation - Provider Assignment', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let practiceId: number;
  let providers: { id: number; first_name: string; last_name: string; specialty: string }[];

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
    await pool.query('DELETE FROM providers');
    await pool.query('DELETE FROM practices');

    // Create a test practice
    const practiceResult = await pool.query(`
      INSERT INTO practices (email, password, config)
      VALUES ('booking-test@example.com', 'hashedpw', '{"timezone": "America/New_York"}')
      RETURNING id
    `);
    practiceId = practiceResult.rows[0].id;

    // Create 3 providers for the practice
    const providerResult = await pool.query(
      `
      INSERT INTO providers (practice_id, first_name, last_name, specialty)
      VALUES
        ($1, 'Dr.', 'Martinez', 'General Chiropractic'),
        ($1, 'Dr.', 'Chen', 'Sports Medicine'),
        ($1, 'Dr.', 'Johnson', 'Pediatric Care')
      RETURNING id, first_name, last_name, specialty
    `,
      [practiceId]
    );
    providers = providerResult.rows;
  });

  describe('Provider Availability Detection', () => {
    it('should find available providers when none have appointments', async () => {
      // Query for conflicts for each provider at 10am-11am EST (15:00-16:00 UTC)
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');

      const availableProviders: typeof providers = [];

      for (const provider of providers) {
        const conflicts = await pool.query(
          `
          SELECT id FROM appointments
          WHERE practice_id = $1
            AND provider_id = $2
            AND start_at < $4
            AND end_at > $3
            AND status NOT IN ('cancelled', 'declined')
        `,
          [practiceId, provider.id, startAt.toISOString(), endAt.toISOString()]
        );

        if (conflicts.rows.length === 0) {
          availableProviders.push(provider);
        }
      }

      // All 3 providers should be available
      expect(availableProviders).toHaveLength(3);
    });

    it('should exclude providers with conflicting appointments', async () => {
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');

      // Create appointment for Dr. Martinez at this time
      await pool.query(
        `
        INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type)
        VALUES ($1, $2, $3, $4, 'accepted', 'adjustment')
      `,
        [practiceId, providers[0].id, startAt.toISOString(), endAt.toISOString()]
      );

      const availableProviders: typeof providers = [];

      for (const provider of providers) {
        const conflicts = await pool.query(
          `
          SELECT id FROM appointments
          WHERE practice_id = $1
            AND provider_id = $2
            AND start_at < $4
            AND end_at > $3
            AND status NOT IN ('cancelled', 'declined')
        `,
          [practiceId, provider.id, startAt.toISOString(), endAt.toISOString()]
        );

        if (conflicts.rows.length === 0) {
          availableProviders.push(provider);
        }
      }

      // Only 2 providers should be available (Dr. Chen and Dr. Johnson)
      expect(availableProviders).toHaveLength(2);
      expect(availableProviders.map((p) => p.last_name)).not.toContain('Martinez');
    });

    it('should return no available providers when all are busy', async () => {
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');

      // Create appointments for all 3 providers at the same time
      for (const provider of providers) {
        await pool.query(
          `
          INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type)
          VALUES ($1, $2, $3, $4, 'accepted', 'adjustment')
        `,
          [practiceId, provider.id, startAt.toISOString(), endAt.toISOString()]
        );
      }

      const availableProviders: typeof providers = [];

      for (const provider of providers) {
        const conflicts = await pool.query(
          `
          SELECT id FROM appointments
          WHERE practice_id = $1
            AND provider_id = $2
            AND start_at < $4
            AND end_at > $3
            AND status NOT IN ('cancelled', 'declined')
        `,
          [practiceId, provider.id, startAt.toISOString(), endAt.toISOString()]
        );

        if (conflicts.rows.length === 0) {
          availableProviders.push(provider);
        }
      }

      // No providers should be available
      expect(availableProviders).toHaveLength(0);
    });

    it('should ignore appointments with NULL provider_id when checking specific provider', async () => {
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');

      // Create an unassigned appointment (provider_id = NULL)
      await pool.query(
        `
        INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type)
        VALUES ($1, NULL, $2, $3, 'accepted', 'adjustment')
      `,
        [practiceId, startAt.toISOString(), endAt.toISOString()]
      );

      const availableProviders: typeof providers = [];

      for (const provider of providers) {
        const conflicts = await pool.query(
          `
          SELECT id FROM appointments
          WHERE practice_id = $1
            AND provider_id = $2
            AND start_at < $4
            AND end_at > $3
            AND status NOT IN ('cancelled', 'declined')
        `,
          [practiceId, provider.id, startAt.toISOString(), endAt.toISOString()]
        );

        if (conflicts.rows.length === 0) {
          availableProviders.push(provider);
        }
      }

      // All 3 providers should still be available (unassigned appointment doesn't block them)
      expect(availableProviders).toHaveLength(3);
    });
  });

  describe('Provider Assignment to Booking', () => {
    it('should create appointment with provider_id set', async () => {
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');
      const selectedProvider = providers[0];

      const result = await pool.query(
        `
        INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type, customer_name, customer_phone)
        VALUES ($1, $2, $3, $4, 'accepted', 'adjustment', 'Test Customer', '+15551234567')
        RETURNING id, provider_id
      `,
        [practiceId, selectedProvider.id, startAt.toISOString(), endAt.toISOString()]
      );

      expect(result.rows[0].provider_id).toBe(selectedProvider.id);
    });

    it('should allow booking same time slot with different providers', async () => {
      const startAt = new Date('2026-01-15T15:00:00Z');
      const endAt = new Date('2026-01-15T16:00:00Z');

      // Book first provider
      await pool.query(
        `
        INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type)
        VALUES ($1, $2, $3, $4, 'accepted', 'adjustment')
      `,
        [practiceId, providers[0].id, startAt.toISOString(), endAt.toISOString()]
      );

      // Book second provider at same time - should succeed
      const result = await pool.query(
        `
        INSERT INTO appointments (practice_id, provider_id, start_at, end_at, status, type)
        VALUES ($1, $2, $3, $4, 'accepted', 'adjustment')
        RETURNING id
      `,
        [practiceId, providers[1].id, startAt.toISOString(), endAt.toISOString()]
      );

      expect(result.rows).toHaveLength(1);

      // Verify both appointments exist
      const allAppointments = await pool.query(
        `
        SELECT provider_id FROM appointments
        WHERE practice_id = $1 AND start_at = $2 AND end_at = $3
      `,
        [practiceId, startAt.toISOString(), endAt.toISOString()]
      );

      expect(allAppointments.rows).toHaveLength(2);
      expect(allAppointments.rows.map((r: { provider_id: number }) => r.provider_id)).toContain(
        providers[0].id
      );
      expect(allAppointments.rows.map((r: { provider_id: number }) => r.provider_id)).toContain(
        providers[1].id
      );
    });
  });

  describe('Provider Notes Generation', () => {
    it('should format provider info correctly for notes', () => {
      const provider = { first_name: 'Dr.', last_name: 'Chen', specialty: 'Sports Medicine' };
      expect(formatProviderNotes(provider)).toBe('Provider: Dr. Chen (Sports Medicine)');
    });

    it('should handle provider without specialty', () => {
      const provider = { first_name: 'Dr.', last_name: 'Chen', specialty: null };
      expect(formatProviderNotes(provider)).toBe('Provider: Dr. Chen');
    });

    it('should return undefined for null provider', () => {
      expect(formatProviderNotes(null)).toBeUndefined();
    });
  });
});
