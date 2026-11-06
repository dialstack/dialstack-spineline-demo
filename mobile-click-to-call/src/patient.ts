import { toE164 } from '@c2c/phone';
import {
  findPatientByPhone,
  listAppointments,
  patientName,
  TYPE_LABEL,
  type Patient,
} from '@spineline/spineline';

const digits = (s: string) => s.replace(/\D/g, '');

/** Patients whose name, or the last digits of whose number, match what was typed. */
export function searchPatients(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase();
  if (!q) return patients;
  const qDigits = digits(q);
  return patients.filter(
    (p) =>
      patientName(p).toLowerCase().includes(q) ||
      (qDigits.length >= 3 &&
        digits(p.phone ?? '')
          .slice(-10)
          .includes(qDigits))
  );
}

/** The query as a number to dial, when it is one: no letters, at least 3 digits. */
export function dialable(query: string): string | null {
  const q = query.trim();
  return digits(q).length >= 3 && !/[a-z]/i.test(q) ? (toE164(q) ?? q) : null;
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

const date = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

/** The patient shown on a call, with the details the web app's call card shows. */
export type PatientCard = {
  name: string;
  initials: string;
  subtitle: string;
  details: { label: string; value: string }[];
};

/** The Spineline patient behind a number, with their next and last visit. */
export async function lookupPatient(number: string): Promise<PatientCard | null> {
  const now = Date.now();
  const [patient, appointments] = await Promise.all([
    findPatientByPhone(number),
    listAppointments(new Date(now - 180 * 864e5), new Date(now + 90 * 864e5)),
  ]);
  if (!patient) return null;

  const theirs = appointments
    .filter((a) => a.patient_id === patient.id && a.status !== 'cancelled')
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const next = theirs.find((a) => new Date(a.start_at).getTime() >= now);
  const last = theirs.filter((a) => new Date(a.start_at).getTime() < now).at(-1);
  const details = [
    patient.date_of_birth && { label: 'Date of birth', value: date(patient.date_of_birth) },
    patient.email && { label: 'Email', value: patient.email },
    patient.registration_date && {
      label: 'Patient since',
      value: date(patient.registration_date),
    },
    next && { label: 'Next visit', value: `${day(next.start_at)} · ${TYPE_LABEL[next.type]}` },
    last && {
      label: 'Last visit',
      value: `${day(last.start_at)}${last.status === 'no_show' ? ' · no-show' : ''}`,
    },
  ].filter((d): d is { label: string; value: string } => Boolean(d));

  return {
    name: patientName(patient),
    initials: `${patient.first_name[0]}${patient.last_name[0]}`,
    subtitle: `${(patient.status ?? 'active').replace(/^\w/, (c) => c.toUpperCase())} patient`,
    details,
  };
}
