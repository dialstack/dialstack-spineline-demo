/**
 * Create appointments table migration
 * Multi-tenant: appointments belong to practices
 * Supports DialStack webhook integration for availability and bookings
 */

export function up(pgm) {
  // Create the appointments table
  pgm.createTable('appointments', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    practice_id: {
      type: 'integer',
      notNull: true,
      references: 'practices',
      onDelete: 'CASCADE',
    },
    patient_id: {
      type: 'integer',
      references: 'patients',
      onDelete: 'SET NULL',
    },
    start_at: {
      type: 'timestamptz',
      notNull: true,
    },
    end_at: {
      type: 'timestamptz',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'accepted'",
      comment: 'pending, accepted, cancelled, declined, no_show',
    },
    customer_phone: {
      type: 'varchar(20)',
    },
    customer_name: {
      type: 'varchar(200)',
    },
    customer_email: {
      type: 'varchar(255)',
    },
    notes: {
      type: 'text',
    },
    idempotency_key: {
      type: 'varchar(100)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes for better performance
  pgm.createIndex('appointments', 'practice_id', {
    name: 'idx_appointments_practice_id',
  });
  pgm.createIndex('appointments', ['practice_id', 'start_at', 'end_at'], {
    name: 'idx_appointments_practice_time',
  });

  // Create unique partial index for idempotency
  pgm.sql(`
    CREATE UNIQUE INDEX idx_appointments_idempotency
    ON appointments (practice_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  `);

  // Create trigger to automatically update updated_at (reuses existing function)
  pgm.sql(`
    CREATE TRIGGER update_appointments_updated_at
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);
}

export function down(pgm) {
  // Drop trigger first
  pgm.sql('DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;');

  // Drop indexes
  pgm.sql('DROP INDEX IF EXISTS idx_appointments_idempotency;');
  pgm.dropIndex('appointments', ['practice_id', 'start_at', 'end_at'], {
    name: 'idx_appointments_practice_time',
    ifExists: true,
  });
  pgm.dropIndex('appointments', 'practice_id', {
    name: 'idx_appointments_practice_id',
    ifExists: true,
  });

  // Drop table
  pgm.dropTable('appointments');
}
