import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Patient from "@/app/models/patient";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

/**
 * PATCH /api/patients/[id]
 * Updates a patient's details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id, 10);

    if (isNaN(patientId)) {
      return new Response("Invalid patient ID", { status: 400 });
    }

    // Get authentication token
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Find the practice by email
    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    // Parse request body
    const body = await req.json();

    // Extract allowed fields only
    const allowedFields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "date_of_birth",
      "status",
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response("No valid fields to update", { status: 400 });
    }

    // Update the patient (ownership check is done in the model)
    const updatedPatient = await Patient.update(
      patientId,
      practice.id,
      updates,
    );

    return new Response(JSON.stringify(updatedPatient), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when updating patient");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for "not found" errors
    if (message.includes("not found") || message.includes("access denied")) {
      return new Response("Patient not found", { status: 404 });
    }

    return new Response(message, { status: 500 });
  }
}
