/**
 * Add type column to appointments table
 * Supports: initial, adjustment, walk_in, follow_up
 */

export function up(pgm) {
  pgm.addColumn("appointments", {
    type: {
      type: "varchar(20)",
      notNull: true,
      default: "'adjustment'",
      comment: "initial, adjustment, walk_in, follow_up",
    },
  });
}

export function down(pgm) {
  pgm.dropColumn("appointments", "type");
}
