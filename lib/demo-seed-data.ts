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

/**
 * A VIP demo patient: a sales rep, seeded into their own demo practice so that
 * calling the practice from their own mobile pops their patient record.
 *
 * Adding a rep is one entry here. Nothing else in this file counts VIPs — the
 * filler-patient offset is derived from VIP_PATIENTS.length — so there is no
 * second place to keep in sync.
 *
 * `phoneEnvVar` is read at runtime rather than stored: these are real personal
 * mobile numbers, and everything under spineline/ is mirrored verbatim to a
 * public repository. The number lives in SSM and reaches us as an environment
 * variable; `fallbackPhone` is the unroutable placeholder used when it is
 * absent or "disabled".
 */
export interface VipPatient {
  key: VipKey;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: Date;
  registration_date: Date;
  status: string;
  /** Every appointment for this patient is with this provider. */
  providerLastName: string;
  phoneEnvVar: string;
  fallbackPhone: string;
  appointments: VipAppointment[];
}

/** One appointment, relative to the reference date the seeder is called with. */
export interface VipAppointment {
  dayOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  type: AppointmentType;
  notes: string;
}

export type VipKey = 'michael' | 'jeremy' | 'jake';

export const VIP_PATIENTS: VipPatient[] = [
  {
    key: 'michael',
    first_name: 'Michael',
    last_name: 'Sharp',
    email: 'michael.sharp@example.com',
    date_of_birth: new Date('1978-03-15'),
    registration_date: new Date('2024-01-10'),
    status: 'active',
    providerLastName: 'Martinez',
    phoneEnvVar: 'DEMO_PATIENT_PHONE_MICHAEL',
    fallbackPhone: '+15551000001',
    appointments: [
      {
        dayOffset: -14,
        hour: 9,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Regular spinal adjustment. Patient reports mild lower back discomfort.',
      },
      {
        dayOffset: -12,
        hour: 10,
        minute: 30,
        durationMin: 30,
        type: 'follow_up',
        notes: 'Follow-up on lumbar adjustment. Improvement noted.',
      },
      {
        dayOffset: -9,
        hour: 9,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Thoracic spine adjustment. Patient feeling much better.',
      },
      {
        dayOffset: -7,
        hour: 14,
        minute: 0,
        durationMin: 45,
        type: 'follow_up',
        notes: 'Comprehensive follow-up. Reviewed X-ray results.',
      },
      {
        dayOffset: -5,
        hour: 11,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Cervical adjustment. Mild tension in neck area.',
      },
      {
        dayOffset: -3,
        hour: 9,
        minute: 30,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Routine adjustment. Patient maintaining good progress.',
      },
      {
        dayOffset: 0,
        hour: 10,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Same-day spinal adjustment.',
      },
      {
        dayOffset: 2,
        hour: 10,
        minute: 0,
        durationMin: 30,
        type: 'follow_up',
        notes: 'Scheduled follow-up assessment.',
      },
    ],
  },
  {
    key: 'jeremy',
    first_name: 'Jeremy',
    last_name: 'Charchenko',
    email: 'jeremy.charchenko@example.com',
    date_of_birth: new Date('1985-11-22'),
    registration_date: new Date('2025-06-15'),
    status: 'active',
    providerLastName: 'Chen',
    phoneEnvVar: 'DEMO_PATIENT_PHONE_JEREMY',
    fallbackPhone: '+15551000002',
    appointments: [
      {
        dayOffset: -10,
        hour: 13,
        minute: 0,
        durationMin: 45,
        type: 'initial',
        notes: 'Initial consultation. Patient reports sports injury to shoulder.',
      },
      {
        dayOffset: -7,
        hour: 15,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'First adjustment session. Focus on shoulder and upper back.',
      },
      {
        dayOffset: -4,
        hour: 14,
        minute: 30,
        durationMin: 30,
        type: 'follow_up',
        notes: 'Follow-up on shoulder treatment. Good range of motion improvement.',
      },
      {
        dayOffset: 0,
        hour: 14,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Same-day shoulder adjustment.',
      },
      {
        dayOffset: 5,
        hour: 13,
        minute: 30,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Continued shoulder rehabilitation.',
      },
    ],
  },
  {
    key: 'jake',
    first_name: 'Jake',
    last_name: 'Bascom',
    email: 'jake.bascom@example.com',
    date_of_birth: new Date('1982-07-09'),
    registration_date: new Date('2025-11-03'),
    status: 'active',
    providerLastName: 'Johnson',
    phoneEnvVar: 'DEMO_PATIENT_PHONE_JAKE',
    fallbackPhone: '+15551000003',
    appointments: [
      {
        dayOffset: -21,
        hour: 10,
        minute: 0,
        durationMin: 45,
        type: 'initial',
        notes:
          'Initial consultation. Patient reports recurring lower back pain after long flights.',
      },
      {
        dayOffset: -14,
        hour: 9,
        minute: 0,
        durationMin: 30,
        type: 'adjustment',
        notes: 'First adjustment session. Focus on lumbar spine and hips.',
      },
      {
        dayOffset: -8,
        hour: 11,
        minute: 30,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Lumbar adjustment. Patient reports less morning stiffness.',
      },
      {
        dayOffset: -3,
        hour: 16,
        minute: 0,
        durationMin: 30,
        type: 'follow_up',
        notes: 'Follow-up on lumbar treatment. Reviewed desk setup and stretching routine.',
      },
      // 11:00 is Dr. Johnson's filler3 slot today; 11:30 is his next free one.
      // The seeder inserts straight through Appointment.create, so nothing
      // rejects a double-booking at write time.
      {
        dayOffset: 0,
        hour: 11,
        minute: 30,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Same-day lumbar adjustment.',
      },
      {
        dayOffset: 4,
        hour: 10,
        minute: 30,
        durationMin: 30,
        type: 'adjustment',
        notes: 'Continued lumbar rehabilitation.',
      },
    ],
  },
];

/**
 * Index of a VIP patient in the array buildDemoPatients returns for a demo
 * practice. VIPs occupy the leading slots, filler patients follow.
 */
export function vipIndex(key: VipKey): number {
  const idx = VIP_PATIENTS.findIndex((v) => v.key === key);
  if (idx < 0) throw new Error(`Unknown VIP patient key: ${key}`);
  return idx;
}

/**
 * Resolve each VIP's phone from the environment, falling back to an unroutable
 * placeholder. "disabled" is what the SSM parameter carries when a rep has no
 * number configured in that environment.
 */
export function resolveVipPhones(env: Record<string, string | undefined>): Record<VipKey, string> {
  const phones = {} as Record<VipKey, string>;
  for (const vip of VIP_PATIENTS) {
    const configured = env[vip.phoneEnvVar];
    phones[vip.key] = configured && configured !== 'disabled' ? configured : vip.fallbackPhone;
  }
  return phones;
}

export interface BuildDemoPatientsOptions {
  isDemoPractice: boolean;
  /** Phone per VIP; see resolveVipPhones. */
  vipPhones: Record<VipKey, string>;
}

/**
 * Build demo patient list. VIP patients (with real phone numbers) are only
 * included for known demo practices. Everyone else gets filler patients only.
 */
export function buildDemoPatients(opts: BuildDemoPatientsOptions): DemoPatient[] {
  if (!opts.isDemoPractice) return [...FILLER_PATIENTS];

  const vips: DemoPatient[] = VIP_PATIENTS.map((vip) => ({
    first_name: vip.first_name,
    last_name: vip.last_name,
    email: vip.email,
    phone: opts.vipPhones[vip.key],
    date_of_birth: vip.date_of_birth,
    registration_date: vip.registration_date,
    status: vip.status,
  }));

  return [...vips, ...FILLER_PATIENTS];
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
 * VIP patient appointments are only generated for demo practices.
 */
export function generateDemoAppointments(
  patients: DemoPatient[],
  providers: Provider[],
  referenceDate: Date,
  isDemoPractice = false
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

  if (isDemoPractice) {
    // VIPs occupy the leading patient slots, in VIP_PATIENTS order, matching
    // buildDemoPatients.
    VIP_PATIENTS.forEach((vip, vipIdx) => {
      vip.appointments.forEach((appt, apptIdx) => {
        addAppt(
          vipIdx,
          apptIdx,
          appt.dayOffset,
          appt.hour,
          appt.minute,
          appt.durationMin,
          appt.type,
          vip.providerLastName,
          appt.notes
        );
      });
    });
  }

  // Filler patients with appointments.
  // Filler indices below are 0-based filler positions; vipOffset shifts them past
  // the VIP slots at runtime. Derived from VIP_PATIENTS.length rather than written
  // out, because a stale literal here silently reassigns every filler
  // appointment to the wrong patient — plausible-looking data, not an error.
  const vipOffset = isDemoPractice ? VIP_PATIENTS.length : 0;
  const filler = (idx: number) => idx + vipOffset;

  const fillerWithPast = [0, 2, 3, 5, 7, 9, 11, 13, 15, 17].map(filler);
  const fillerWithFuture = [1, 4, 6, 8, 10, 12, 14, 16].map(filler);

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
  addAppt(filler(0), 50, 0, 9, 0, 45, 'initial', 'Johnson', 'Initial consultation for back pain.');
  addAppt(filler(3), 50, 0, 11, 0, 30, 'adjustment', 'Johnson', 'Routine adjustment visit.');
  addAppt(filler(6), 50, 0, 9, 30, 30, 'walk_in', 'Martinez', 'Walk-in for acute neck pain.');
  addAppt(filler(14), 50, 0, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on knee rehabilitation.');
  addAppt(filler(18), 50, 0, 13, 0, 30, 'adjustment', 'Martinez', 'Adjustment for lower back.');

  // Day -1
  addAppt(filler(1), 50, -1, 9, 0, 30, 'adjustment', 'Martinez', 'Routine spinal adjustment.');
  addAppt(filler(4), 50, -1, 10, 0, 45, 'follow_up', 'Johnson', 'Follow-up on hip treatment.');
  addAppt(filler(8), 50, -1, 14, 0, 30, 'adjustment', 'Chen', 'Upper back adjustment.');
  addAppt(filler(19), 50, -1, 11, 0, 30, 'walk_in', 'Martinez', 'Walk-in for shoulder stiffness.');

  // Day -2
  addAppt(filler(2), 50, -2, 9, 0, 30, 'adjustment', 'Johnson', 'Lumbar adjustment.');
  addAppt(filler(5), 50, -2, 13, 0, 30, 'adjustment', 'Martinez', 'Mid-back adjustment.');
  addAppt(filler(10), 50, -2, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on posture correction.');

  // Day +1
  addAppt(filler(7), 50, 1, 9, 0, 30, 'adjustment', 'Martinez', 'Scheduled spinal adjustment.');
  addAppt(filler(9), 50, 1, 10, 30, 30, 'follow_up', 'Johnson', 'Follow-up on treatment plan.');
  addAppt(filler(11), 50, 1, 14, 0, 30, 'adjustment', 'Chen', 'Cervical spine adjustment.');
  addAppt(filler(20), 50, 1, 11, 0, 30, 'adjustment', 'Martinez', 'Routine adjustment visit.');

  // Day +2
  addAppt(filler(12), 50, 2, 13, 0, 30, 'adjustment', 'Johnson', 'Thoracic adjustment.');
  addAppt(filler(13), 50, 2, 15, 0, 30, 'follow_up', 'Chen', 'Follow-up on treatment progress.');

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
