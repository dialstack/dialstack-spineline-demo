/**
 * Index patients by (practice_id, phone) for the caller lookup.
 *
 * Every inbound call and every AI-receptionist customer lookup runs
 * PatientModel.findByPhone. With only the practice_id index, each lookup read
 * every patient in the practice, then sorted the matches to pick one.
 */

export async function up(pgm) {
  pgm.createIndex('patients', ['practice_id', 'phone'], {
    name: 'idx_patients_practice_phone',
  });
}

export async function down(pgm) {
  pgm.dropIndex('patients', ['practice_id', 'phone'], {
    name: 'idx_patients_practice_phone',
  });
}
