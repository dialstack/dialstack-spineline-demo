/**
 * Create providers table migration
 * Multi-tenant: providers belong to practices
 */

export function up(pgm) {
  pgm.createTable('providers', {
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
    specialty: {
      type: 'varchar(100)',
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

  pgm.createIndex('providers', 'practice_id', {
    name: 'idx_providers_practice_id',
  });

  // Trigger to automatically update updated_at
  pgm.sql(`
    CREATE TRIGGER update_providers_updated_at
        BEFORE UPDATE ON providers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  // Seed default providers for all existing practices
  pgm.sql(`
    INSERT INTO providers (practice_id, first_name, last_name, specialty)
    SELECT id, 'Dr.', 'Martinez', 'General Chiropractic' FROM practices
    UNION ALL
    SELECT id, 'Dr.', 'Chen', 'Sports Medicine' FROM practices
    UNION ALL
    SELECT id, 'Dr.', 'Johnson', 'Pediatric Care' FROM practices;
  `);
}

export function down(pgm) {
  pgm.sql('DROP TRIGGER IF EXISTS update_providers_updated_at ON providers;');

  pgm.dropIndex('providers', 'practice_id', {
    name: 'idx_providers_practice_id',
    ifExists: true,
  });

  pgm.dropTable('providers');
}
