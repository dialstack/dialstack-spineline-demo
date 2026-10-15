import type { Patient } from '@/app/models/patient';

type Named = Pick<Patient, 'first_name' | 'last_name'>;

export const patientFullName = (p: Named) => `${p.first_name} ${p.last_name}`;
export const patientInitials = (p: Named) => `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`;
