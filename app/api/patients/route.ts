import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Patient from "@/app/models/patient";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

/**
 * GET /api/patients
 * Returns all patients for the authenticated practice
 */
export async function GET(req: NextRequest) {
  try {
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

    // Fetch all patients for this practice
    const patients = await Patient.findAllByPractice(practice.id);

    // Return patients as JSON
    return new Response(JSON.stringify(patients), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when retrieving patients");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * POST /api/patients
 * Creates a new patient for the authenticated practice
 */
export async function POST(req: NextRequest) {
  try {
    // Get authentication token
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse request body
    const body = await req.json();

    // Validate required fields
    if (!body.first_name || !body.last_name) {
      return new Response("First name and last name are required", {
        status: 400,
      });
    }

    // Connect to database
    await dbConnect();

    // Find the practice by email
    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    // Create the patient
    const patient = await Patient.create(practice.id, {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || null,
      phone: body.phone || null,
      date_of_birth: body.date_of_birth || null,
      status: body.status || "active",
    });

    // Return created patient as JSON
    return new Response(JSON.stringify(patient), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when creating patient");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}
