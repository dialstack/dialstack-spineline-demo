/**
 * Create patients table migration
 * Multi-tenant: patients belong to practices
 */

export function up(pgm) {
  // Create the patients table
  pgm.createTable('patients', {
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
    first_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    last_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
    },
    phone: {
      type: 'varchar(20)',
    },
    date_of_birth: {
      type: 'date',
    },
    registration_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'active'",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes for better performance
  pgm.createIndex('patients', 'practice_id', {
    name: 'idx_patients_practice_id',
  });
  pgm.createIndex('patients', 'email', { name: 'idx_patients_email' });
  pgm.createIndex('patients', 'registration_date', {
    name: 'idx_patients_registration_date',
  });

  // Create unique constraint on practice_id + email to prevent duplicate emails within a practice
  pgm.addConstraint('patients', 'unique_practice_email', {
    unique: ['practice_id', 'email'],
  });

  // Create trigger to automatically update updated_at (reuses existing function)
  pgm.sql(`
    CREATE TRIGGER update_patients_updated_at
        BEFORE UPDATE ON patients
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);
}

export function down(pgm) {
  // Drop trigger first
  pgm.sql('DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;');

  // Drop the unique constraint
  pgm.dropConstraint('patients', 'unique_practice_email', { ifExists: true });

  // Drop indexes (automatically dropped with table, but explicit for clarity)
  pgm.dropIndex('patients', 'practice_id', {
    name: 'idx_patients_practice_id',
    ifExists: true,
  });
  pgm.dropIndex('patients', 'email', {
    name: 'idx_patients_email',
    ifExists: true,
  });
  pgm.dropIndex('patients', 'registration_date', {
    name: 'idx_patients_registration_date',
    ifExists: true,
  });

  // Drop table (cascades to foreign keys)
  pgm.dropTable('patients');
}
