import { SPINELINE_URL } from './config';
import { clearTokens, getSpinelineToken } from './storage';

/**
 * The Spineline backend's JSON API — the same routes the web app uses, called
 * with the bearer token from /api/mobile/login instead of the session cookie.
 * Shapes follow the web app's `app/models/*`.
 */

export type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  registration_date?: string | null;
  status?: string | null;
};

export type Appointment = {
  id: number;
  patient_id?: number | null;
  start_at: string;
  end_at: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'declined' | 'no_show';
  type: 'initial' | 'adjustment' | 'walk_in' | 'follow_up';
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
};

export class UnauthorizedError extends Error {}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SPINELINE_URL) throw new Error('EXPO_PUBLIC_SPINELINE_URL is not set');
  const token = getSpinelineToken();
  const res = await fetch(`${SPINELINE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    // An expired or revoked sign-in: drop it so the app returns to Login.
    if (token) clearTokens();
    throw new UnauthorizedError('Signed out');
  }
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function login(email: string, password: string): Promise<string> {
  const { token } = await api<{ token: string }>('/api/mobile/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return token;
}

export const listPatients = () => api<Patient[]>('/api/patients');

/**
 * The practice's DialStack user, created if it has none yet: the webrtc-session
 * route only finds a user, so a practice that never opened the web softphone
 * would otherwise get a 409 at sign-in.
 */
export const ensureDialstackUser = () => api<{ id: string }>('/api/dialstack/user');

export function listAppointments(start: Date, end: Date): Promise<Appointment[]> {
  const q = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
  return api<Appointment[]>(`/api/appointments?${q}`);
}

export const patientName = (p: Pick<Patient, 'first_name' | 'last_name'>) =>
  `${p.first_name} ${p.last_name}`;
