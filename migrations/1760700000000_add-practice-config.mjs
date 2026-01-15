/**
 * Add config column to practices table
 * Stores practice-level configuration as JSONB including timezone
 */

export async function up(pgm) {
  pgm.addColumn('practices', {
    config: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func(`'{"timezone": "America/New_York"}'::jsonb`),
    },
  });
}

export async function down(pgm) {
  pgm.dropColumn('practices', 'config');
}
