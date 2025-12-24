import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Patient from "@/app/models/patient";
import Provider from "@/app/models/provider";
import Appointment, { AppointmentType } from "@/app/models/appointment";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

const APPOINTMENT_TYPES: AppointmentType[] = [
  "initial",
  "adjustment",
  "walk_in",
  "follow_up",
];

/**
 * Generate a random appointment for a given date, patient, and provider
 */
function generateAppointment(
  date: Date,
  patientId: number,
  providerId: number,
  existingSlots: Set<string>,
) {
  // Generate random time slot (9 AM - 4:45 PM, 15-minute increments)
  const hour = 9 + Math.floor(Math.random() * 8); // 9-16
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45

  // Include provider in slot key to allow same time slots for different providers
  const slotKey = `${date.toISOString().split("T")[0]}-${hour}-${minute}-${providerId}`;
  if (existingSlots.has(slotKey)) {
    return null; // Slot already taken for this provider
  }
  existingSlots.add(slotKey);

  const startAt = new Date(date);
  startAt.setHours(hour, minute, 0, 0);

  // Random duration: 15, 30, 45, or 60 minutes (weighted toward 15 and 30)
  const durations = [15, 15, 15, 30, 30, 45, 60];
  const durationMinutes =
    durations[Math.floor(Math.random() * durations.length)];

  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

  const type =
    APPOINTMENT_TYPES[Math.floor(Math.random() * APPOINTMENT_TYPES.length)];

  return {
    start_at: startAt,
    end_at: endAt,
    patient_id: patientId,
    provider_id: providerId,
    status: "accepted" as const,
    type,
    notes: null,
  };
}

/**
 * POST /api/testdata/appointments
 * Creates test appointments for the authenticated practice
 * Requires existing patients in the practice
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const count = parseInt(body.count, 10);

    if (!count || count < 1 || count > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid count. Must be between 1 and 50." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response(JSON.stringify({ error: "Practice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get existing patients
    const patients = await Patient.findAllByPractice(practice.id);

    if (patients.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No patients found. Create test patients first.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get existing providers
    const providers = await Provider.findAllByPractice(practice.id);

    if (providers.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No providers found. Create providers first.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Use the provided date or default to today
    const targetDate = body.date ? new Date(body.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const existingSlots = new Set<string>();
    const createdAppointments = [];

    for (let i = 0; i < count; i++) {
      // Pick a random patient
      const patient = patients[Math.floor(Math.random() * patients.length)];

      // Pick a random provider
      const provider = providers[Math.floor(Math.random() * providers.length)];

      const appointmentData = generateAppointment(
        targetDate,
        patient.id!,
        provider.id!,
        existingSlots,
      );

      if (!appointmentData) {
        // Slot conflict, skip
        continue;
      }

      try {
        const appointment = await Appointment.create(
          practice.id,
          appointmentData,
        );
        createdAppointments.push(appointment);
      } catch (error) {
        logger.warn(
          { error, appointmentData },
          "Failed to create test appointment",
        );
        continue;
      }
    }

    logger.info(
      { practiceId: practice.id, count: createdAppointments.length },
      "Created test appointments",
    );

    return new Response(
      JSON.stringify({
        success: true,
        count: createdAppointments.length,
        appointments: createdAppointments,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    logger.error(
      { error },
      "An error occurred while creating test appointments",
    );
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
