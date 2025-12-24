import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Appointment from "@/app/models/appointment";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

/**
 * GET /api/appointments
 * Returns appointments for the authenticated practice within a date range
 * Query params: start (ISO date), end (ISO date)
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      return new Response("start and end query parameters are required", {
        status: 400,
      });
    }

    const startDate = new Date(startParam);
    const endDate = new Date(endParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new Response("Invalid date format", { status: 400 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const appointments = await Appointment.findByPractice(
      practice.id,
      startDate,
      endDate,
    );

    return new Response(JSON.stringify(appointments), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when retrieving appointments");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * POST /api/appointments
 * Creates a new appointment for the authenticated practice
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.start_at || !body.end_at) {
      return new Response("start_at and end_at are required", { status: 400 });
    }

    const startAt = new Date(body.start_at);
    const endAt = new Date(body.end_at);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      return new Response("Invalid date format", { status: 400 });
    }

    if (startAt >= endAt) {
      return new Response("start_at must be before end_at", { status: 400 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    // Check for conflicts (skip if status is cancelled or declined)
    const status = body.status || "accepted";
    if (status !== "cancelled" && status !== "declined") {
      const conflicts = await Appointment.findConflicting(
        practice.id,
        startAt,
        endAt,
      );
      if (conflicts.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Time slot conflicts with existing appointment",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const appointment = await Appointment.create(practice.id, {
      start_at: startAt,
      end_at: endAt,
      patient_id: body.patient_id || null,
      status: status,
      type: body.type || "adjustment",
      notes: body.notes || null,
    });

    return new Response(JSON.stringify(appointment), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when creating appointment");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}
