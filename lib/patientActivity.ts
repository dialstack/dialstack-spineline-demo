/**
 * Deterministic fake data generator for patient activities and billing.
 * Uses patient ID as seed for consistent results across page loads.
 */

export interface PatientActivity {
  type: 'appointment' | 'note';
  title: string;
  date: Date;
}

export interface PatientActivitySummary {
  lastActivity: PatientActivity;
  nextActivity: PatientActivity | null;
  outstandingBalance: number;
}

const APPOINTMENT_TYPES = [
  'Initial Consultation',
  'Follow-up Adjustment',
  'Spinal Assessment',
  'Wellness Check',
  'Re-evaluation',
];

const NOTE_TYPES = ['Progress Note', 'Treatment Plan Update', 'X-ray Review'];

/**
 * Simple seeded pseudo-random number generator.
 * Returns a function that produces deterministic values 0-1 based on the seed.
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate deterministic fake activities and balance for a patient.
 * Same patient ID always produces the same results.
 */
export function generatePatientActivity(patientId: number): PatientActivitySummary {
  const random = createSeededRandom(patientId);
  const now = new Date();

  // Generate last activity (0-30 days ago)
  const lastDaysAgo = Math.floor(random() * 30);
  const lastDate = new Date(now);
  lastDate.setDate(lastDate.getDate() - lastDaysAgo);
  lastDate.setHours(9 + Math.floor(random() * 8), Math.floor(random() * 60), 0, 0);

  const lastActivity: PatientActivity = {
    type: random() > 0.3 ? 'appointment' : 'note',
    title:
      random() > 0.3
        ? APPOINTMENT_TYPES[Math.floor(random() * APPOINTMENT_TYPES.length)]
        : NOTE_TYPES[Math.floor(random() * NOTE_TYPES.length)],
    date: lastDate,
  };

  // Generate next activity (60% chance, 1-14 days out)
  const hasNext = random() > 0.4;
  const nextDaysOut = Math.floor(random() * 14) + 1;
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + nextDaysOut);
  nextDate.setHours(9 + Math.floor(random() * 8), 0, 0, 0);

  const nextActivity: PatientActivity | null = hasNext
    ? {
        type: 'appointment',
        title: APPOINTMENT_TYPES[Math.floor(random() * APPOINTMENT_TYPES.length)],
        date: nextDate,
      }
    : null;

  // Generate outstanding balance (70% chance of $0, otherwise $25-$500)
  const hasBalance = random() > 0.7;
  const outstandingBalance = hasBalance ? Math.round((random() * 475 + 25) * 100) / 100 : 0;

  return { lastActivity, nextActivity, outstandingBalance };
}
