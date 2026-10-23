import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runner as migrate } from 'node-pg-migrate';
import PatientModel from '../app/models/patient';
import { closePool } from '../lib/dbConnect';

const PHONE = '+18015031561';

describe('PatientModel.findByPhone with a shared phone', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let practiceId: number;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('public.ecr.aws/docker/library/postgres:16-alpine')
      .withExposedPorts(5432)
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });

    await migrate({
      databaseUrl: container.getConnectionUri(),
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      verbose: false,
      log: () => {},
    });

    // The model connects through the shared dbConnect() pool, which reads these.
    process.env.DATABASE_SECRET = JSON.stringify({
      username: container.getUsername(),
      password: container.getPassword(),
    });
    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getPort());
    process.env.DB_NAME = container.getDatabase();
    process.env.DB_SSL_ENABLED = 'false';
  });

  afterAll(async () => {
    await closePool();
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM patients');
    await pool.query('DELETE FROM practices');
    const practice = await pool.query(
      `INSERT INTO practices (email, password) VALUES ('phone-test@example.com', 'hashedpw') RETURNING id`
    );
    practiceId = practice.rows[0].id;
  });

  // The reported case: a "New Patient" placeholder got the caller's phone
  // first, then the real patient's record was created with the same phone.
  it('returns the most recently updated patient, not the oldest', async () => {
    const placeholder = await PatientModel.create(practiceId, {
      first_name: 'New',
      last_name: 'Patient',
      phone: PHONE,
    });
    const jake = await PatientModel.create(practiceId, {
      first_name: 'Jake',
      last_name: 'Bascom',
      phone: PHONE,
    });

    expect((await PatientModel.findByPhone(practiceId, PHONE))?.id).toBe(jake.id);

    // Editing the placeholder afterwards makes it the one that pops.
    await PatientModel.update(placeholder.id!, practiceId, { email: 'x@example.com' });
    expect((await PatientModel.findByPhone(practiceId, PHONE))?.id).toBe(placeholder.id);
  });

  it('breaks an updated_at tie by the newest id', async () => {
    await PatientModel.create(practiceId, { first_name: 'A', last_name: 'One', phone: PHONE });
    const second = await PatientModel.create(practiceId, {
      first_name: 'B',
      last_name: 'Two',
      phone: PHONE,
    });
    // The updated_at trigger would overwrite a manual SET, so pause it to force a tie.
    await pool.query('ALTER TABLE patients DISABLE TRIGGER update_patients_updated_at');
    await pool.query(`UPDATE patients SET updated_at = '2026-01-01T00:00:00Z'`);
    await pool.query('ALTER TABLE patients ENABLE TRIGGER update_patients_updated_at');

    expect((await PatientModel.findByPhone(practiceId, PHONE))?.id).toBe(second.id);
  });

  it('prefers the patient whose name matches, whatever was updated last', async () => {
    const parent = await PatientModel.create(practiceId, {
      first_name: 'Dana',
      last_name: 'Smith',
      phone: PHONE,
    });
    const child = await PatientModel.create(practiceId, {
      first_name: 'Sam',
      last_name: 'Smith',
      phone: PHONE,
    });
    await PatientModel.update(parent.id!, practiceId, { status: 'active' });

    expect((await PatientModel.findByPhone(practiceId, PHONE, ' sam smith '))?.id).toBe(child.id);
    // A name that matches nobody falls back to the most recently updated.
    expect((await PatientModel.findByPhone(practiceId, PHONE, 'Alex Smith'))?.id).toBe(parent.id);
  });

  it('only matches patients of the same practice', async () => {
    const other = await pool.query(
      `INSERT INTO practices (email, password) VALUES ('other@example.com', 'hashedpw') RETURNING id`
    );
    await PatientModel.create(other.rows[0].id, {
      first_name: 'Other',
      last_name: 'Practice',
      phone: PHONE,
    });

    expect(await PatientModel.findByPhone(practiceId, PHONE)).toBeNull();
  });
});
