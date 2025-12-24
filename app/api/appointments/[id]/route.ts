import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Appointment from "@/app/models/appointment";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

/**
 * GET /api/appointments/[id]
 * Returns a single appointment
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId)) {
      return new Response("Invalid appointment ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const appointment = await Appointment.findById(appointmentId, practice.id);

    if (!appointment) {
      return new Response("Appointment not found", { status: 404 });
    }

    return new Response(JSON.stringify(appointment), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when retrieving appointment");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * PATCH /api/appointments/[id]
 * Updates an appointment
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId)) {
      return new Response("Invalid appointment ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const body = await req.json();

    // Build update object with only allowed fields
    const allowedFields = [
      "start_at",
      "end_at",
      "patient_id",
      "status",
      "type",
      "notes",
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "start_at" || field === "end_at") {
          updates[field] = new Date(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response("No valid fields to update", { status: 400 });
    }

    // Check for conflicts if time is being updated
    if (updates.start_at || updates.end_at) {
      // Get existing appointment to fill in missing time fields
      const existing = await Appointment.findById(appointmentId, practice.id);
      if (!existing) {
        return new Response("Appointment not found", { status: 404 });
      }

      const newStartAt = (updates.start_at as Date) || existing.start_at;
      const newEndAt = (updates.end_at as Date) || existing.end_at;

      // Only check conflicts if status won't be cancelled/declined
      const newStatus = (updates.status as string) || existing.status;
      if (newStatus !== "cancelled" && newStatus !== "declined") {
        const conflicts = await Appointment.findConflicting(
          practice.id,
          newStartAt,
          newEndAt,
          appointmentId,
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
    }

    const updatedAppointment = await Appointment.update(
      appointmentId,
      practice.id,
      updates,
    );

    if (!updatedAppointment) {
      return new Response("Appointment not found", { status: 404 });
    }

    return new Response(JSON.stringify(updatedAppointment), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when updating appointment");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/[id]
 * Deletes an appointment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId)) {
      return new Response("Invalid appointment ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const deleted = await Appointment.delete(appointmentId, practice.id);

    if (!deleted) {
      return new Response("Appointment not found", { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when deleting appointment");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}
