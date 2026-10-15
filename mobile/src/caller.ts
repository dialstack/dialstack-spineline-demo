import type { Call } from '@dialstack/sdk-native';

import { listAppointments, listPatients, patientName, type Appointment } from './spineline';

const TYPE_LABEL: Record<Appointment['type'], string> = {
  initial: 'Initial consult',
  adjustment: 'Adjustment',
  walk_in: 'Walk-in',
  follow_up: 'Follow-up',
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

// Compare on the last 10 digits, so "+15551230000", "(555) 123-0000" and an
// extension like "1003" all match however the caller id arrives.
const digits = (n: string) => n.replace(/\D/g, '').slice(-10);

/** The patient behind a call, as Spineline's own screens title it. */
export type PeerInfo = { name: string; avatar: { initials: string } };

export type PatientCard = {
  subtitle: string;
  details: { label: string; value: string }[];
};

// What Spineline's own screens add beyond the name and initials, by call id.
// Filled by the same lookup, so it is ready when the name is.
const cards = new Map<string, PatientCard>();
export const patientCard = (call: Call) => cards.get(call.id) ?? null;

/**
 * The Spineline patient behind a call's number.
 * The SDK titles the call with the name and draws the avatar; the next and last
 * visit are kept for the Custom UI, which has room for them.
 */
export async function resolvePatient(call: Call): Promise<PeerInfo | null> {
  const number = call.direction === 'inbound' ? call.from : call.to;
  const patient = (await listPatients()).find((p) => p.phone && digits(p.phone) === digits(number));
  if (!patient) return null;

  const now = Date.now();
  const theirs = (await listAppointments(new Date(now - 180 * 864e5), new Date(now + 90 * 864e5)))
    .filter((a) => a.patient_id === patient.id && a.status !== 'cancelled')
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const next = theirs.find((a) => new Date(a.start_at).getTime() >= now);
  const last = theirs.filter((a) => new Date(a.start_at).getTime() < now).at(-1);
  const age = patient.date_of_birth
    ? Math.floor((now - new Date(patient.date_of_birth).getTime()) / (365.25 * 864e5))
    : null;

  const details = [
    next && { label: 'Next visit', value: `${day(next.start_at)} · ${TYPE_LABEL[next.type]}` },
    last && {
      label: 'Last visit',
      value: `${day(last.start_at)}${last.status === 'no_show' ? ' · no-show' : ''}`,
    },
    age !== null && { label: 'Age', value: String(age) },
  ].filter((d): d is { label: string; value: string } => Boolean(d));

  cards.clear(); // only the current call's card is needed; don't keep old visits around
  cards.set(call.id, {
    subtitle: `${(patient.status ?? 'active').replace(/^\w/, (c) => c.toUpperCase())} patient`,
    details,
  });
  return {
    name: patientName(patient),
    avatar: { initials: `${patient.first_name[0]}${patient.last_name[0]}` },
  };
}
