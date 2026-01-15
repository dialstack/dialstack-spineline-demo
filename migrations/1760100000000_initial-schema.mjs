/**
 * Initial database schema migration
 * Creates practices table with indexes and triggers
 */

export function up(pgm) {
  // Create the practices table
  pgm.createTable('practices', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password: {
      type: 'varchar(255)',
      notNull: true,
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
  pgm.createIndex('practices', 'email', { name: 'idx_practices_email' });
  pgm.createIndex('practices', 'created_at', {
    name: 'idx_practices_created_at',
  });

  // Create function to automatically update the updated_at column
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create trigger to automatically update updated_at
  pgm.sql(`
    CREATE TRIGGER update_practices_updated_at
        BEFORE UPDATE ON practices
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);
}

export function down(pgm) {
  // Drop trigger first
  pgm.sql('DROP TRIGGER IF EXISTS update_practices_updated_at ON practices;');

  // Drop function
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column();');

  // Drop indexes (automatically dropped with table, but explicit for clarity)
  pgm.dropIndex('practices', 'email', {
    name: 'idx_practices_email',
    ifExists: true,
  });
  pgm.dropIndex('practices', 'created_at', {
    name: 'idx_practices_created_at',
    ifExists: true,
  });

  // Drop table
  pgm.dropTable('practices');
}
