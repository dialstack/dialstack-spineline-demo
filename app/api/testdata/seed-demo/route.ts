import { NextRequest } from 'next/server';
import Practice from '@/app/models/practice';
import Patient from '@/app/models/patient';
import Appointment from '@/app/models/appointment';
import Provider from '@/app/models/provider';
import dbConnect from '@/lib/dbConnect';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';
import { buildDemoPatients, generateDemoAppointments } from '@/lib/demo-seed-data';

const DEFAULT_MICHAEL_PHONE = '+15551000001';
const DEFAULT_JEREMY_PHONE = '+15551000002';

/**
 * POST /api/testdata/seed-demo
 * Seeds deterministic demo patients and appointments for live demos.
 * Idempotent: deletes existing demo-seed data before recreating.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const pool = await dbConnect();

    const practice = await Practice.findByEmail(token.email);
    if (!practice || !practice.id) {
      return new Response(JSON.stringify({ error: 'Practice not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read phone overrides: request body > env var > fallback
    let michaelPhone = DEFAULT_MICHAEL_PHONE;
    let jeremyPhone = DEFAULT_JEREMY_PHONE;

    try {
      const body = await req.json();
      if (body.michael_phone) michaelPhone = body.michael_phone;
      if (body.jeremy_phone) jeremyPhone = body.jeremy_phone;
    } catch {
      // Empty body is fine — use env/fallback values
    }

    // Env vars override defaults but not explicit request body values
    const envMichael = process.env.DEMO_PATIENT_PHONE_MICHAEL;
    const envJeremy = process.env.DEMO_PATIENT_PHONE_JEREMY;
    if (michaelPhone === DEFAULT_MICHAEL_PHONE && envMichael && envMichael !== 'disabled') {
      michaelPhone = envMichael;
    }
    if (jeremyPhone === DEFAULT_JEREMY_PHONE && envJeremy && envJeremy !== 'disabled') {
      jeremyPhone = envJeremy;
    }

    // Delete existing demo data (idempotent reset)
    await pool.query(
      `DELETE FROM appointments WHERE practice_id = $1 AND idempotency_key LIKE 'demo-seed-%'`,
      [practice.id]
    );
    await pool.query(`DELETE FROM patients WHERE practice_id = $1 AND email LIKE '%@example.com'`, [
      practice.id,
    ]);

    // Fetch providers
    const providers = await Provider.findAllByPractice(practice.id);
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No providers found. Create default providers first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build and create patients
    const demoPatients = buildDemoPatients(michaelPhone, jeremyPhone);
    const createdPatients: { id: number; index: number }[] = [];

    for (let i = 0; i < demoPatients.length; i++) {
      try {
        const patient = await Patient.create(practice.id, demoPatients[i]);
        createdPatients.push({ id: patient.id!, index: i });
      } catch (error) {
        logger.warn({ error, patient: demoPatients[i].email }, 'Failed to create demo patient');
      }
    }

    // Generate and create appointments
    const demoAppointments = generateDemoAppointments(demoPatients, providers, new Date());
    let appointmentsCreated = 0;

    for (const appt of demoAppointments) {
      const patientRecord = createdPatients.find((p) => p.index === appt.patientIndex);
      if (!patientRecord) continue;

      const provider = providers.find((p) => p.last_name === appt.providerLastName);
      if (!provider) continue;

      try {
        await Appointment.create(practice.id, {
          patient_id: patientRecord.id,
          provider_id: provider.id!,
          start_at: appt.start_at,
          end_at: appt.end_at,
          type: appt.type,
          notes: appt.notes,
          idempotency_key: appt.idempotency_key,
          status: 'accepted',
        });
        appointmentsCreated++;
      } catch (error) {
        logger.warn({ error, key: appt.idempotency_key }, 'Failed to create demo appointment');
      }
    }

    logger.info(
      {
        practiceId: practice.id,
        patients: createdPatients.length,
        appointments: appointmentsCreated,
      },
      'Seeded demo data'
    );

    return new Response(
      JSON.stringify({
        success: true,
        patients_created: createdPatients.length,
        appointments_created: appointmentsCreated,
        vip_patients: [
          { name: 'Michael Sharp', phone: michaelPhone },
          { name: 'Jeremy Charchenko', phone: jeremyPhone },
        ],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to seed demo data');
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
