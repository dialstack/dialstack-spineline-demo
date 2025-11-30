import { NextRequest, NextResponse } from "next/server";
import Practice from "@/app/models/practice";
import Patient from "@/app/models/patient";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";
import { normalizePhone } from "@/lib/phone";

/**
 * GET /api/patients/lookup?phone=+15551234567
 * Looks up a patient by phone number for screen pop functionality.
 * Returns the patient if found, or null if no match.
 */
export async function GET(req: NextRequest) {
  try {
    // Get authentication token
    const token = await getToken({ req });

    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get phone number from query params
    const phone = req.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone parameter" },
        { status: 400 },
      );
    }

    // Normalize phone number to E.164 format
    // Note: DialStack events already send E.164, but normalize just in case
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Find the practice by email
    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return NextResponse.json(
        { error: "Practice not found" },
        { status: 404 },
      );
    }

    // Look up patient by phone
    const patient = await Patient.findByPhone(practice.id, normalizedPhone);

    // Return patient (or null if not found)
    return NextResponse.json({ patient });
  } catch (error: unknown) {
    logger.error({ error }, "Error looking up patient by phone");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
