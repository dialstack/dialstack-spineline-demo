import type { Patient } from '@/app/models/patient';

type Named = Pick<Patient, 'first_name' | 'last_name'>;

export const patientFullName = (p: Named) => `${p.first_name} ${p.last_name}`;
export const patientInitials = (p: Named) => `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`;

/**
 * Split a caller-ID name into a patient's first and last name: the last word is
 * the last name, everything before it the first name. An all-caps name (the
 * usual carrier caller-ID style) is title-cased. Null when there aren't at
 * least two words, since a patient needs both names.
 *
 * @example
 * splitCallerName('Jake Bascom') // { first_name: 'Jake', last_name: 'Bascom' }
 * splitCallerName('MARY ANN LEE') // { first_name: 'Mary Ann', last_name: 'Lee' }
 */
export function splitCallerName(name: string | null | undefined): Named | null {
  let words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  if (words.join(' ') === words.join(' ').toUpperCase()) {
    words = words.map((w) => w.charAt(0) + w.slice(1).toLowerCase());
  }
  return { first_name: words.slice(0, -1).join(' '), last_name: words[words.length - 1] };
}
