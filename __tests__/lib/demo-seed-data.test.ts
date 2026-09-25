import { describe, it, expect } from 'vitest';
import {
  buildDemoPatients,
  generateDemoAppointments,
  resolveVipPhones,
  vipIndex,
  VIP_PATIENTS,
} from '../../lib/demo-seed-data';
import type { Provider } from '../../app/models/provider';

const TEST_MICHAEL_PHONE = '+15551000001';
const TEST_JEREMY_PHONE = '+15551000002';
const TEST_JAKE_PHONE = '+15551000003';

const TEST_VIP_PHONES = {
  michael: TEST_MICHAEL_PHONE,
  jeremy: TEST_JEREMY_PHONE,
  jake: TEST_JAKE_PHONE,
};

const VIP_MICHAEL_INDEX = vipIndex('michael');
const VIP_JEREMY_INDEX = vipIndex('jeremy');
const VIP_JAKE_INDEX = vipIndex('jake');

const mockProviders: Provider[] = [
  {
    id: 1,
    practice_id: 1,
    first_name: 'Dr.',
    last_name: 'Martinez',
    specialty: 'General Chiropractic',
  },
  { id: 2, practice_id: 1, first_name: 'Dr.', last_name: 'Chen', specialty: 'Sports Medicine' },
  { id: 3, practice_id: 1, first_name: 'Dr.', last_name: 'Johnson', specialty: 'Pediatric Care' },
];

describe('buildDemoPatients', () => {
  describe('for demo practices', () => {
    const patients = buildDemoPatients({
      isDemoPractice: true,
      vipPhones: TEST_VIP_PHONES,
    });

    it('returns VIP patients at the expected indices', () => {
      expect(patients[VIP_MICHAEL_INDEX].first_name).toBe('Michael');
      expect(patients[VIP_MICHAEL_INDEX].last_name).toBe('Sharp');
      expect(patients[VIP_JEREMY_INDEX].first_name).toBe('Jeremy');
      expect(patients[VIP_JEREMY_INDEX].last_name).toBe('Charchenko');
      expect(patients[VIP_JAKE_INDEX].first_name).toBe('Jake');
      expect(patients[VIP_JAKE_INDEX].last_name).toBe('Bascom');
    });

    // The VIP slots must be the LEADING slots and in VIP_PATIENTS order, because
    // generateDemoAppointments offsets every filler index by VIP_PATIENTS.length.
    it('VIP patients occupy the leading slots in list order', () => {
      VIP_PATIENTS.forEach((vip, i) => {
        expect(patients[i].first_name).toBe(vip.first_name);
        expect(patients[i].last_name).toBe(vip.last_name);
      });
    });

    it('VIP patients have all required fields', () => {
      for (const vip of VIP_PATIENTS.map((_, i) => patients[i])) {
        expect(vip.first_name).toBeTruthy();
        expect(vip.last_name).toBeTruthy();
        expect(vip.email).toContain('@example.com');
        expect(vip.phone).toBeTruthy();
        expect(vip.date_of_birth).toBeInstanceOf(Date);
        expect(vip.registration_date).toBeInstanceOf(Date);
        expect(vip.status).toBe('active');
      }
    });

    it('VIP patients use provided phone numbers', () => {
      expect(patients[VIP_MICHAEL_INDEX].phone).toBe(TEST_MICHAEL_PHONE);
      expect(patients[VIP_JEREMY_INDEX].phone).toBe(TEST_JEREMY_PHONE);
      expect(patients[VIP_JAKE_INDEX].phone).toBe(TEST_JAKE_PHONE);
    });

    // A phone landing on the wrong VIP would pop the wrong record mid-demo, and
    // every phone is a plausible value for every VIP, so pin them pairwise.
    it('each VIP gets its own phone and no other', () => {
      const assigned = VIP_PATIENTS.map((vip, i) => [vip.key, patients[i].phone]);
      expect(assigned).toEqual([
        ['michael', TEST_MICHAEL_PHONE],
        ['jeremy', TEST_JEREMY_PHONE],
        ['jake', TEST_JAKE_PHONE],
      ]);
    });

    it('produces one patient per VIP plus the filler set', () => {
      expect(patients.length).toBeGreaterThanOrEqual(25);
      expect(patients.length).toBeLessThanOrEqual(30);
    });

    it('all patients have @example.com emails', () => {
      for (const p of patients) {
        expect(p.email).toContain('@example.com');
      }
    });

    it('has a mix of active and inactive patients', () => {
      const active = patients.filter((p) => p.status === 'active');
      const inactive = patients.filter((p) => p.status === 'inactive');
      expect(active.length).toBeGreaterThan(20);
      expect(inactive.length).toBeGreaterThanOrEqual(3);
    });

    it('all emails are unique', () => {
      const emails = patients.map((p) => p.email);
      expect(new Set(emails).size).toBe(emails.length);
    });
  });

  describe('for non-demo practices', () => {
    const patients = buildDemoPatients({
      isDemoPractice: false,
      vipPhones: TEST_VIP_PHONES,
    });

    it('does not include VIP patients', () => {
      const names = patients.map((p) => `${p.first_name} ${p.last_name}`);
      for (const vip of VIP_PATIENTS) {
        expect(names).not.toContain(`${vip.first_name} ${vip.last_name}`);
      }
    });

    it('returns only filler patients (~25)', () => {
      expect(patients.length).toBeGreaterThanOrEqual(23);
      expect(patients.length).toBeLessThanOrEqual(27);
    });

    it('no patient has a real phone number', () => {
      const vipPhones = Object.values(TEST_VIP_PHONES);
      for (const p of patients) {
        expect(vipPhones).not.toContain(p.phone);
      }
    });

    it('all patients have @example.com emails', () => {
      for (const p of patients) {
        expect(p.email).toContain('@example.com');
      }
    });
  });
});

describe('resolveVipPhones', () => {
  it('reads each VIP phone from its own env var', () => {
    const phones = resolveVipPhones({
      DEMO_PATIENT_PHONE_MICHAEL: '+12125550001',
      DEMO_PATIENT_PHONE_JEREMY: '+12125550002',
      DEMO_PATIENT_PHONE_JAKE: '+12125550003',
    });
    expect(phones).toEqual({
      michael: '+12125550001',
      jeremy: '+12125550002',
      jake: '+12125550003',
    });
  });

  it('falls back to the placeholder when a var is absent', () => {
    const phones = resolveVipPhones({});
    for (const vip of VIP_PATIENTS) {
      expect(phones[vip.key]).toBe(vip.fallbackPhone);
    }
  });

  // "disabled" is the literal the SSM parameter carries when a rep has no
  // number in that environment, so it must not reach a patient record.
  it('treats "disabled" as absent', () => {
    const phones = resolveVipPhones({
      DEMO_PATIENT_PHONE_MICHAEL: 'disabled',
      DEMO_PATIENT_PHONE_JEREMY: '+12125550002',
    });
    expect(phones.michael).toBe(vipPatient('michael').fallbackPhone);
    expect(phones.jeremy).toBe('+12125550002');
    expect(phones.jake).toBe(vipPatient('jake').fallbackPhone);
  });

  it('gives every VIP a distinct fallback', () => {
    const fallbacks = VIP_PATIENTS.map((v) => v.fallbackPhone);
    expect(new Set(fallbacks).size).toBe(fallbacks.length);
  });

  // Real mobile numbers must never be committed here: everything under
  // spineline/ is mirrored verbatim to a public repository.
  it('stores no real phone number in the VIP list', () => {
    for (const vip of VIP_PATIENTS) {
      expect(vip.fallbackPhone).toMatch(/^\+1555/);
      expect(vip.phoneEnvVar).toMatch(/^DEMO_PATIENT_PHONE_/);
    }
  });
});

function vipPatient(key: string) {
  const vip = VIP_PATIENTS.find((v) => v.key === key);
  if (!vip) throw new Error(`no VIP ${key}`);
  return vip;
}

describe('generateDemoAppointments', () => {
  describe('with demo practice (VIP patients included)', () => {
    const patients = buildDemoPatients({
      isDemoPractice: true,
      vipPhones: TEST_VIP_PHONES,
    });
    const referenceDate = new Date('2026-03-16T12:00:00');
    const appointments = generateDemoAppointments(patients, mockProviders, referenceDate, true);

    it('generates appointments', () => {
      expect(appointments.length).toBeGreaterThan(0);
    });

    it('Michael has ~8 appointments (6 past + 1 today + 1 upcoming)', () => {
      const michaelAppts = appointments.filter((a) => a.patientIndex === VIP_MICHAEL_INDEX);
      expect(michaelAppts.length).toBe(8);
    });

    it('Jeremy has ~5 appointments (3 past + 1 today + 1 upcoming)', () => {
      const jeremyAppts = appointments.filter((a) => a.patientIndex === VIP_JEREMY_INDEX);
      expect(jeremyAppts.length).toBe(5);
    });

    it('Michael appointments are mostly with Dr. Martinez', () => {
      const michaelAppts = appointments.filter((a) => a.patientIndex === VIP_MICHAEL_INDEX);
      const martinezCount = michaelAppts.filter((a) => a.providerLastName === 'Martinez').length;
      expect(martinezCount).toBe(michaelAppts.length);
    });

    it('Jeremy appointments are with Dr. Chen', () => {
      const jeremyAppts = appointments.filter((a) => a.patientIndex === VIP_JEREMY_INDEX);
      const chenCount = jeremyAppts.filter((a) => a.providerLastName === 'Chen').length;
      expect(chenCount).toBe(jeremyAppts.length);
    });

    it('Jake has 6 appointments (4 past + 1 today + 1 upcoming)', () => {
      const jakeAppts = appointments.filter((a) => a.patientIndex === VIP_JAKE_INDEX);
      expect(jakeAppts.length).toBe(6);
    });

    it('Jake appointments are with Dr. Johnson', () => {
      const jakeAppts = appointments.filter((a) => a.patientIndex === VIP_JAKE_INDEX);
      const johnsonCount = jakeAppts.filter((a) => a.providerLastName === 'Johnson').length;
      expect(johnsonCount).toBe(jakeAppts.length);
    });

    // Every VIP's appointment count and provider must match its own list entry.
    // This is what catches a VIP block being emitted against the wrong index.
    it('each VIP gets exactly its own appointments', () => {
      VIP_PATIENTS.forEach((vip, i) => {
        const own = appointments.filter((a) => a.patientIndex === i);
        expect(own.length).toBe(vip.appointments.length);
        for (const appt of own) {
          expect(appt.providerLastName).toBe(vip.providerLastName);
        }
        expect(own.map((a) => a.notes).sort()).toEqual(vip.appointments.map((a) => a.notes).sort());
      });
    });

    // The filler offset is derived from VIP_PATIENTS.length; if it ever drifts,
    // filler appointments land on VIP patients and read as odd demo data rather
    // than as a bug. No filler appointment may reference a VIP slot.
    it('no filler appointment lands on a VIP slot', () => {
      const vipNotes = new Set(VIP_PATIENTS.flatMap((v) => v.appointments.map((a) => a.notes)));
      const onVipSlots = appointments.filter((a) => a.patientIndex < VIP_PATIENTS.length);
      for (const appt of onVipSlots) {
        expect(vipNotes).toContain(appt.notes);
      }
    });

    // The seeder calls Appointment.create directly, bypassing the booking
    // route's conflict check, so nothing else stops it emitting a
    // double-booking. Adding a VIP is exactly when that happens: their
    // appointments are hand-placed against filler slots nobody re-reads.
    // The pre-Jake data already satisfied this, so it pins an existing
    // property rather than grandfathering a violation.
    it('never double-books a provider', () => {
      const conflicts: string[] = [];
      for (let i = 0; i < appointments.length; i++) {
        for (let j = i + 1; j < appointments.length; j++) {
          const a = appointments[i];
          const b = appointments[j];
          if (a.providerLastName !== b.providerLastName) continue;
          if (a.start_at < b.end_at && b.start_at < a.end_at) {
            conflicts.push(
              `${a.providerLastName}: patient ${a.patientIndex} at ${a.start_at.toISOString()} ` +
                `overlaps patient ${b.patientIndex} at ${b.start_at.toISOString()}`
            );
          }
        }
      }
      expect(conflicts).toEqual([]);
    });

    it('all appointment times are within business hours (9-17)', () => {
      for (const appt of appointments) {
        const hour = appt.start_at.getHours();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(17);
      }
    });

    it('all idempotency keys are prefixed with demo-seed-', () => {
      for (const appt of appointments) {
        expect(appt.idempotency_key).toMatch(/^demo-seed-\d+-\d+$/);
      }
    });

    it('all idempotency keys are unique', () => {
      const keys = appointments.map((a) => a.idempotency_key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('appointment durations are 15-45 minutes', () => {
      for (const appt of appointments) {
        const durationMin = (appt.end_at.getTime() - appt.start_at.getTime()) / 60_000;
        expect(durationMin).toBeGreaterThanOrEqual(15);
        expect(durationMin).toBeLessThanOrEqual(45);
      }
    });

    it('has a mix of past and future appointments', () => {
      const past = appointments.filter((a) => a.start_at < referenceDate);
      const future = appointments.filter((a) => a.start_at > referenceDate);
      expect(past.length).toBeGreaterThan(0);
      expect(future.length).toBeGreaterThan(0);
    });

    it('has appointments for today', () => {
      const todayStr = referenceDate.toDateString();
      const todayAppts = appointments.filter((a) => a.start_at.toDateString() === todayStr);
      expect(todayAppts.length).toBeGreaterThanOrEqual(5);
    });

    it('total appointment count is between 50 and 60', () => {
      expect(appointments.length).toBeGreaterThanOrEqual(50);
      expect(appointments.length).toBeLessThanOrEqual(60);
    });

    it('throws if a required provider is missing', () => {
      const incompleteProviders = mockProviders.filter((p) => p.last_name !== 'Martinez');
      expect(() => generateDemoAppointments(patients, incompleteProviders, referenceDate)).toThrow(
        /Provider "Martinez" not found/
      );
    });
  });

  describe('with non-demo practice (filler patients only)', () => {
    const patients = buildDemoPatients({
      isDemoPractice: false,
      vipPhones: TEST_VIP_PHONES,
    });
    const referenceDate = new Date('2026-03-16T12:00:00');
    const appointments = generateDemoAppointments(patients, mockProviders, referenceDate, false);

    it('generates appointments for filler patients', () => {
      expect(appointments.length).toBeGreaterThan(0);
    });

    it('no appointments have VIP-specific notes', () => {
      const vipNotes = VIP_PATIENTS.flatMap((v) => v.appointments.map((a) => a.notes));
      for (const appt of appointments) {
        expect(vipNotes).not.toContain(appt.notes);
      }
    });

    it('all appointment patientIndex values resolve to a real patient', () => {
      for (const appt of appointments) {
        expect(appt.patientIndex).toBeGreaterThanOrEqual(0);
        expect(appt.patientIndex).toBeLessThan(patients.length);
      }
    });

    it('all idempotency keys are unique', () => {
      const keys = appointments.map((a) => a.idempotency_key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
