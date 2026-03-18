import { describe, it, expect } from 'vitest';
import {
  buildDemoPatients,
  generateDemoAppointments,
  VIP_MICHAEL_INDEX,
  VIP_JEREMY_INDEX,
} from '../../lib/demo-seed-data';
import type { Provider } from '../../app/models/provider';

const TEST_MICHAEL_PHONE = '+15551000001';
const TEST_JEREMY_PHONE = '+15551000002';

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
      michaelPhone: TEST_MICHAEL_PHONE,
      jeremyPhone: TEST_JEREMY_PHONE,
    });

    it('returns VIP patients at the expected indices', () => {
      expect(patients[VIP_MICHAEL_INDEX].first_name).toBe('Michael');
      expect(patients[VIP_MICHAEL_INDEX].last_name).toBe('Sharp');
      expect(patients[VIP_JEREMY_INDEX].first_name).toBe('Jeremy');
      expect(patients[VIP_JEREMY_INDEX].last_name).toBe('Charchenko');
    });

    it('VIP patients have all required fields', () => {
      for (const vip of [patients[VIP_MICHAEL_INDEX], patients[VIP_JEREMY_INDEX]]) {
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
    });

    it('produces ~27 total patients (2 VIP + ~25 filler)', () => {
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
      michaelPhone: TEST_MICHAEL_PHONE,
      jeremyPhone: TEST_JEREMY_PHONE,
    });

    it('does not include VIP patients', () => {
      const names = patients.map((p) => `${p.first_name} ${p.last_name}`);
      expect(names).not.toContain('Michael Sharp');
      expect(names).not.toContain('Jeremy Charchenko');
    });

    it('returns only filler patients (~25)', () => {
      expect(patients.length).toBeGreaterThanOrEqual(23);
      expect(patients.length).toBeLessThanOrEqual(27);
    });

    it('no patient has a real phone number', () => {
      for (const p of patients) {
        expect(p.phone).not.toBe(TEST_MICHAEL_PHONE);
        expect(p.phone).not.toBe(TEST_JEREMY_PHONE);
      }
    });

    it('all patients have @example.com emails', () => {
      for (const p of patients) {
        expect(p.email).toContain('@example.com');
      }
    });
  });
});

describe('generateDemoAppointments', () => {
  describe('with demo practice (VIP patients included)', () => {
    const patients = buildDemoPatients({
      isDemoPractice: true,
      michaelPhone: TEST_MICHAEL_PHONE,
      jeremyPhone: TEST_JEREMY_PHONE,
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
      michaelPhone: TEST_MICHAEL_PHONE,
      jeremyPhone: TEST_JEREMY_PHONE,
    });
    const referenceDate = new Date('2026-03-16T12:00:00');
    const appointments = generateDemoAppointments(patients, mockProviders, referenceDate, false);

    it('generates appointments for filler patients', () => {
      expect(appointments.length).toBeGreaterThan(0);
    });

    it('no appointments have VIP-specific notes', () => {
      const vipNotes = [
        'Regular spinal adjustment. Patient reports mild lower back discomfort.',
        'Follow-up on lumbar adjustment. Improvement noted.',
        'Initial consultation. Patient reports sports injury to shoulder.',
        'Same-day spinal adjustment.',
        'Same-day shoulder adjustment.',
        'Continued shoulder rehabilitation.',
      ];
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
