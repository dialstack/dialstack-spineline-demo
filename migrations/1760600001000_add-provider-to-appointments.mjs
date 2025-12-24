/**
 * Add provider_id column to appointments table
 * Links appointments to providers (doctors)
 */

export function up(pgm) {
  pgm.addColumn("appointments", {
    provider_id: {
      type: "integer",
      references: "providers",
      onDelete: "SET NULL",
    },
  });

  pgm.createIndex("appointments", "provider_id", {
    name: "idx_appointments_provider_id",
  });
}

export function down(pgm) {
  pgm.dropIndex("appointments", "provider_id", {
    name: "idx_appointments_provider_id",
    ifExists: true,
  });

  pgm.dropColumn("appointments", "provider_id");
}
