import type { AppointmentType } from '../app/models/appointment';
import type { Provider } from '../app/models/provider';

// Demo patient data for seeding
export interface DemoPatient {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: Date;
  registration_date: Date;
  status: string;
}

// Demo appointment data for seeding
export interface DemoAppointment {
  patientIndex: number;
  providerLastName: string;
  start_at: Date;
  end_at: Date;
  type: AppointmentType;
  notes: string;
  idempotency_key: string;
}

// VIP patient indices
export const VIP_MICHAEL_INDEX = 0;
export const VIP_JEREMY_INDEX = 1;

/**
 * Build demo patient list with VIP patients first, then filler patients.
 * Phone numbers for VIP patients come from env vars or fallbacks.
 */
export function buildDemoPatients(michaelPhone: string, jeremyPhone: string): DemoPatient[] {
  return [
    // VIP #0: Michael Sharp — long-time patient
    {
      first_name: 'Michael',
      last_name: 'Sharp',
      email: 'michael.sharp@example.com',
      phone: michaelPhone,
      date_of_birth: new Date('1978-03-15'),
      registration_date: new Date('2024-01-10'),
      status: 'active',
    },
    // VIP #1: Jeremy Charchenko — newer patient
    {
      first_name: 'Jeremy',
      last_name: 'Charchenko',
      email: 'jeremy.charchenko@example.com',
      phone: jeremyPhone,
      date_of_birth: new Date('1985-11-22'),
      registration_date: new Date('2025-06-15'),
      status: 'active',
    },
    // Filler patients (~25)
    ...FILLER_PATIENTS,
  ];
}

const FILLER_PATIENTS: DemoPatient[] = [
  {
    first_name: 'Sarah',
    last_name: 'Mitchell',
    email: 'sarah.mitchell@example.com',
    phone: '+15552000001',
    date_of_birth: new Date('1965-07-20'),
    registration_date: new Date('2023-03-14'),
    status: 'active',
  },
  {
    first_name: 'David',
    last_name: 'Kowalski',
    email: 'david.kowalski@example.com',
    phone: '+15552000002',
    date_of_birth: new Date('1972-01-08'),
    registration_date: new Date('2023-05-22'),
    status: 'active',
  },
  {
    first_name: 'Linda',
    last_name: 'Vasquez',
    email: 'linda.vasquez@example.com',
    phone: '+15552000003',
    date_of_birth: new Date('1958-11-30'),
    registration_date: new Date('2023-06-01'),
    status: 'active',
  },
  {
    first_name: 'Robert',
    last_name: 'Nakamura',
    email: 'robert.nakamura@example.com',
    phone: '+15552000004',
    date_of_birth: new Date('1980-04-12'),
    registration_date: new Date('2023-07-19'),
    status: 'active',
  },
  {
    first_name: 'Jennifer',
    last_name: 'Okafor',
    email: 'jennifer.okafor@example.com',
    phone: '+15552000005',
    date_of_birth: new Date('1990-09-25'),
    registration_date: new Date('2023-08-30'),
    status: 'active',
  },
  {
    first_name: 'William',
    last_name: 'Brennan',
    email: 'william.brennan@example.com',
    phone: '+15552000006',
    date_of_birth: new Date('1955-12-03'),
    registration_date: new Date('2023-09-10'),
    status: 'active',
  },
  {
    first_name: 'Maria',
    last_name: 'Petrov',
    email: 'maria.petrov@example.com',
    phone: '+15552000007',
    date_of_birth: new Date('1988-06-17'),
    registration_date: new Date('2023-10-05'),
    status: 'active',
  },
  {
    first_name: 'James',
    last_name: 'Thornton',
    email: 'james.thornton@example.com',
    phone: '+15552000008',
    date_of_birth: new Date('1975-02-28'),
    registration_date: new Date('2023-11-12'),
    status: 'active',
  },
  {
    first_name: 'Patricia',
    last_name: 'Delgado',
    email: 'patricia.delgado@example.com',
    phone: '+15552000009',
    date_of_birth: new Date('1962-08-14'),
    registration_date: new Date('2023-12-20'),
    status: 'active',
  },
  {
    first_name: 'Thomas',
    last_name: 'Fitzgerald',
    email: 'thomas.fitzgerald@example.com',
    phone: '+15552000010',
    date_of_birth: new Date('1993-05-06'),
    registration_date: new Date('2024-01-25'),
    status: 'active',
  },
  {
    first_name: 'Barbara',
    last_name: 'Singh',
    email: 'barbara.singh@example.com',
    phone: '+15552000011',
    date_of_birth: new Date('1970-10-31'),
    registration_date: new Date('2024-02-18'),
    status: 'active',
  },
  {
    first_name: 'Charles',
    last_name: 'Romano',
    email: 'charles.romano@example.com',
    phone: '+15552000012',
    date_of_birth: new Date('1983-03-22'),
    registration_date: new Date('2024-03-07'),
    status: 'active',
  },
  {
    first_name: 'Elizabeth',
    last_name: 'Huang',
    email: 'elizabeth.huang@example.com',
    phone: '+15552000013',
    date_of_birth: new Date('1996-07-09'),
    registration_date: new Date('2024-04-14'),
    status: 'active',
  },
  {
    first_name: 'Daniel',
    last_name: 'Moreau',
    email: 'daniel.moreau@example.com',
    phone: '+15552000014',
    date_of_birth: new Date('1968-01-19'),
    registration_date: new Date('2024-05-03'),
    status: 'active',
  },
  {
    first_name: 'Susan',
    last_name: 'Andersen',
    email: 'susan.andersen@example.com',
    phone: '+15552000015',
    date_of_birth: new Date('1977-09-08'),
    registration_date: new Date('2024-06-21'),
    status: 'active',
  },
  {
    first_name: 'Kevin',
    last_name: 'Patel',
    email: 'kevin.patel@example.com',
    phone: '+15552000016',
    date_of_birth: new Date('1991-04-27'),
    registration_date: new Date('2024-07-11'),
    status: 'active',
  },
  {
    first_name: 'Nancy',
    last_name: 'Bergstrom',
    email: 'nancy.bergstrom@example.com',
    phone: '+15552000017',
    date_of_birth: new Date('1960-12-15'),
    registration_date: new Date('2024-08-02'),
    status: 'active',
  },
  {
    first_name: 'Steven',
    last_name: 'Cruz',
    email: 'steven.cruz@example.com',
    phone: '+15552000018',
    date_of_birth: new Date('1985-06-30'),
    registration_date: new Date('2024-09-19'),
    status: 'active',
  },
  {
    first_name: 'Karen',
    last_name: 'Johansson',
    email: 'karen.johansson@example.com',
    phone: '+15552000019',
    date_of_birth: new Date('1973-08-21'),
    registration_date: new Date('2024-10-08'),
    status: 'active',
  },
  {
    first_name: 'Brian',
    last_name: 'Ortiz',
    email: 'brian.ortiz@example.com',
    phone: '+15552000020',
    date_of_birth: new Date('1998-02-11'),
    registration_date: new Date('2024-11-15'),
    status: 'active',
  },
  {
    first_name: 'Dorothy',
    last_name: 'Kim',
    email: 'dorothy.kim@example.com',
    phone: '+15552000021',
    date_of_birth: new Date('1957-05-24'),
    registration_date: new Date('2024-12-01'),
    status: 'active',
  },
  {
    first_name: 'Gary',
    last_name: 'Novak',
    email: 'gary.novak@example.com',
    phone: '+15552000022',
    date_of_birth: new Date('1982-11-07'),
    registration_date: new Date('2025-01-10'),
    status: 'active',
  },
  // Inactive patients
  {
    first_name: 'Helen',
    last_name: 'Dubois',
    email: 'helen.dubois@example.com',
    phone: '+15552000023',
    date_of_birth: new Date('1966-03-18'),
    registration_date: new Date('2023-04-05'),
    status: 'inactive',
  },
  {
    first_name: 'Frank',
    last_name: 'Ivanov',
    email: 'frank.ivanov@example.com',
    phone: '+15552000024',
    date_of_birth: new Date('1978-09-29'),
    registration_date: new Date('2023-08-11'),
    status: 'inactive',
  },
  {
    first_name: 'Ruth',
    last_name: 'Olsen',
    email: 'ruth.olsen@example.com',
    phone: '+15552000025',
    date_of_birth: new Date('1955-06-12'),
    registration_date: new Date('2024-02-28'),
    status: 'inactive',
  },
];

/**
 * Generate demo appointments relative to a reference date.
 * Returns appointments with provider IDs resolved by last name.
 */
export function generateDemoAppointments(
  patients: DemoPatient[],
  providers: Provider[],
  referenceDate: Date
): DemoAppointment[] {
  const appointments: DemoAppointment[] = [];

  const findProvider = (lastName: string) => providers.find((p) => p.last_name === lastName);

  const makeTime = (dayOffset: number, hour: number, minute: number): Date => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const addAppt = (
    patientIdx: number,
    apptIdx: number,
    dayOffset: number,
    hour: number,
    minute: number,
    durationMin: number,
    type: AppointmentType,
    providerLastName: string,
    notes: string
  ) => {
    const start = makeTime(dayOffset, hour, minute);
    const end = new Date(start.getTime() + durationMin * 60_000);
    appointments.push({
      patientIndex: patientIdx,
      providerLastName,
      start_at: start,
      end_at: end,
      type,
      notes,
      idempotency_key: `demo-seed-${patientIdx}-${apptIdx}`,
    });
  };

  // Michael Sharp — 6 past appointments + 1 today + 1 upcoming
  addAppt(
    0,
    0,
    -14,
    9,
    0,
    30,
    'adjustment',
    'Martinez',
    'Regular spinal adjustment. Patient reports mild lower back discomfort.'
  );
  addAppt(
    0,
    1,
    -12,
    10,
    30,
    30,
    'follow_up',
    'Martinez',
    'Follow-up on lumbar adjustment. Improvement noted.'
  );
  addAppt(
    0,
    2,
    -9,
    9,
    0,
    30,
    'adjustment',
    'Martinez',
    'Thoracic spine adjustment. Patient feeling much better.'
  );
  addAppt(
    0,
    3,
    -7,
    14,
    0,
    45,
    'follow_up',
    'Martinez',
    'Comprehensive follow-up. Reviewed X-ray results.'
  );
  addAppt(
    0,
    4,
    -5,
    11,
    0,
    30,
    'adjustment',
    'Martinez',
    'Cervical adjustment. Mild tension in neck area.'
  );
  addAppt(
    0,
    5,
    -3,
    9,
    30,
    30,
    'adjustment',
    'Martinez',
    'Routine adjustment. Patient maintaining good progress.'
  );
  addAppt(0, 6, 0, 10, 0, 30, 'adjustment', 'Martinez', 'Same-day spinal adjustment.');
  addAppt(0, 7, 2, 10, 0, 30, 'follow_up', 'Martinez', 'Scheduled follow-up assessment.');

  // Jeremy Charchenko — 3 past appointments + 1 today + 1 upcoming
  addAppt(
    1,
    0,
    -10,
    13,
    0,
    45,
    'initial',
    'Chen',
    'Initial consultation. Patient reports sports injury to shoulder.'
  );
  addAppt(
    1,
    1,
    -7,
    15,
    0,
    30,
    'adjustment',
    'Chen',
    'First adjustment session. Focus on shoulder and upper back.'
  );
  addAppt(
    1,
    2,
    -4,
    14,
    30,
    30,
    'follow_up',
    'Chen',
    'Follow-up on shoulder treatment. Good range of motion improvement.'
  );
  addAppt(1, 3, 0, 14, 0, 30, 'adjustment', 'Chen', 'Same-day shoulder adjustment.');
  addAppt(1, 4, 5, 13, 30, 30, 'adjustment', 'Chen', 'Continued shoulder rehabilitation.');

  // Filler patients with appointments (indices 2-26, but only ~10 get past, ~8 get future)
  const fillerWithPast = [2, 4, 5, 7, 9, 11, 13, 15, 17, 19];
  const fillerWithFuture = [3, 6, 8, 10, 12, 14, 16, 18];

  const providerRotation = ['Martinez', 'Chen', 'Johnson'];

  fillerWithPast.forEach((pIdx, i) => {
    const provider = providerRotation[i % 3];
    const dayOff = -(15 + i * 2);
    const hour = 9 + (i % 7);
    addAppt(
      pIdx,
      0,
      dayOff,
      hour,
      0,
      30,
      'adjustment',
      provider,
      'Routine chiropractic adjustment.'
    );
    if (i % 3 === 0) {
      addAppt(pIdx, 1, dayOff + 3, hour + 1, 0, 30, 'follow_up', provider, 'Follow-up visit.');
    }
  });

  fillerWithFuture.forEach((pIdx, i) => {
    const provider = providerRotation[i % 3];
    const dayOff = 3 + i * 2;
    const hour = 10 + (i % 6);
    addAppt(
      pIdx,
      0,
      dayOff,
      hour,
      0,
      30,
      i === 0 ? 'initial' : 'adjustment',
      provider,
      'Upcoming appointment.'
    );
  });

  // Near-today appointments — dense coverage around day 0
  // Day 0 (today)
  addAppt(2, 50, 0, 9, 0, 45, 'initial', 'Johnson', 'Initial consultation for back pain.');
  addAppt(5, 50, 0, 11, 0, 30, 'adjustment', 'Johnson', 'Routine adjustment visit.');
  addAppt(8, 50, 0, 9, 30, 30, 'walk_in', 'Martinez', 'Walk-in for acute neck pain.');
  addAppt(16, 50, 0, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on knee rehabilitation.');
  addAppt(20, 50, 0, 13, 0, 30, 'adjustment', 'Martinez', 'Adjustment for lower back.');

  // Day -1
  addAppt(3, 50, -1, 9, 0, 30, 'adjustment', 'Martinez', 'Routine spinal adjustment.');
  addAppt(6, 50, -1, 10, 0, 45, 'follow_up', 'Johnson', 'Follow-up on hip treatment.');
  addAppt(10, 50, -1, 14, 0, 30, 'adjustment', 'Chen', 'Upper back adjustment.');
  addAppt(21, 50, -1, 11, 0, 30, 'walk_in', 'Martinez', 'Walk-in for shoulder stiffness.');

  // Day -2
  addAppt(4, 50, -2, 9, 0, 30, 'adjustment', 'Johnson', 'Lumbar adjustment.');
  addAppt(7, 50, -2, 13, 0, 30, 'adjustment', 'Martinez', 'Mid-back adjustment.');
  addAppt(12, 50, -2, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on posture correction.');

  // Day +1
  addAppt(9, 50, 1, 9, 0, 30, 'adjustment', 'Martinez', 'Scheduled spinal adjustment.');
  addAppt(11, 50, 1, 10, 30, 30, 'follow_up', 'Johnson', 'Follow-up on treatment plan.');
  addAppt(13, 50, 1, 14, 0, 30, 'adjustment', 'Chen', 'Cervical spine adjustment.');
  addAppt(22, 50, 1, 11, 0, 30, 'adjustment', 'Martinez', 'Routine adjustment visit.');

  // Day +2 (non-VIP additions)
  addAppt(14, 50, 2, 13, 0, 30, 'adjustment', 'Johnson', 'Thoracic adjustment.');
  addAppt(15, 50, 2, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on treatment progress.');

  // Verify all providers exist (used for resolving at insert time)
  for (const appt of appointments) {
    if (!findProvider(appt.providerLastName)) {
      throw new Error(
        `Provider "${appt.providerLastName}" not found. Available: ${providers.map((p) => p.last_name).join(', ')}`
      );
    }
  }

  return appointments;
}
