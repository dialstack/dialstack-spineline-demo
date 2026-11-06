import type { Call } from '@dialstack/sdk-native';

import { findPatientByPhone, listAppointments, patientName, TYPE_LABEL } from './spineline';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

/** The patient behind a call, as Spineline's own screens title it. */
export type PeerInfo = { name: string; avatar: { initials: string } };

export type PatientCard = {
  subtitle: string;
  details: { label: string; value: string }[];
};

export const peerNumber = (call: Call) => (call.direction === 'inbound' ? call.from : call.to);

/**
 * Which lookup a call's screens should show. A forward or transfer keeps the
 * call's id but changes who is on the other end, so the number is part of it.
 */
export const peerKey = (call: Call) => `${call.id}:${peerNumber(call)}`;

// What Spineline's own screens add beyond the name and initials, by peerKey.
// Filled by the same lookup, so it is ready when the name is.
const cards = new Map<string, PatientCard>();
export const patientCard = (call: Call) => cards.get(peerKey(call)) ?? null;

// One lookup per party, shared by the drop-in's resolvePeer and the Custom UI.
const lookups = new Map<string, Promise<PeerInfo | null>>();

/**
 * The Spineline patient behind a call's number. The drop-in titles the call
 * with the name and draws the avatar (it is the provider's `resolvePeer`); the
 * next and last visit are kept for the Custom UI, which has room for them.
 */
export function resolvePatient(call: Call): Promise<PeerInfo | null> {
  const key = peerKey(call);
  let lookup = lookups.get(key);
  if (!lookup) {
    lookup = lookupPatient(call).catch(() => null);
    lookups.clear(); // only the current party's lookup is needed
    lookups.set(key, lookup);
  }
  return lookup;
}

async function lookupPatient(call: Call): Promise<PeerInfo | null> {
  const now = Date.now();
  const [patient, appointments] = await Promise.all([
    findPatientByPhone(peerNumber(call)),
    listAppointments(new Date(now - 180 * 864e5), new Date(now + 90 * 864e5)),
  ]);
  if (!patient) return null;

  const theirs = appointments
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
  cards.set(peerKey(call), {
    subtitle: `${(patient.status ?? 'active').replace(/^\w/, (c) => c.toUpperCase())} patient`,
    details,
  });
  return {
    name: patientName(patient),
    avatar: { initials: `${patient.first_name[0]}${patient.last_name[0]}` },
  };
}
