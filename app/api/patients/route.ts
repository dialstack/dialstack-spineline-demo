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
