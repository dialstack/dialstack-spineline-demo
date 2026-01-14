import { NextRequest, NextResponse } from "next/server";
import {
  DialStack,
  AvailabilitySearchWebhook,
  AvailabilitySearchResponse,
  WebhookErrorResponse,
} from "@dialstack/sdk/server";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, addDays } from "date-fns";
import PracticeModel, { getTimezone } from "@/app/models/practice";
import AppointmentModel from "@/app/models/appointment";
import { generateAvailabilities } from "@/lib/availability";

// POST /api/dialstack/webhooks/availability/search
// DialStack calls this endpoint to search for available appointment slots
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.DIALSTACK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("DIALSTACK_WEBHOOK_SECRET not configured");
    return NextResponse.json<WebhookErrorResponse>(
      {
        error: {
          code: "configuration_error",
          message: "Webhook not configured",
        },
      },
      { status: 500 },
    );
  }

  // Get raw body and signature
  const body = await request.text();
  const signature = request.headers.get("x-dialstack-signature");

  if (!signature) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        error: {
          code: "invalid_signature",
          message: "Missing signature header",
        },
      },
      { status: 401 },
    );
  }

  // Verify signature and parse webhook payload
  let event: AvailabilitySearchWebhook;
  try {
    event = DialStack.webhooks.constructEvent<AvailabilitySearchWebhook>(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json<WebhookErrorResponse>(
      {
        error: {
          code: "invalid_signature",
          message: "Signature verification failed",
        },
      },
      { status: 401 },
    );
  }

  // Find practice by DialStack account ID
  const practice = await PracticeModel.findByDialstackAccountId(
    event.account_id,
  );
  if (!practice || !practice.id) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        error: {
          code: "account_not_found",
          message: "No practice linked to this account",
        },
      },
      { status: 404 },
    );
  }

  // Parse the requested time range
  const { start_at, end_at } = event.query.filter.start_at_range;
  const rangeStart = new Date(start_at);
  const rangeEnd = new Date(end_at);

  // Get existing appointments in this range
  const existingAppointments = await AppointmentModel.findByPractice(
    practice.id,
    rangeStart,
    rangeEnd,
  );

  // Get the practice's timezone
  const timezone = getTimezone(practice);

  // Calculate the range of days to iterate through in the practice's timezone
  // We need to expand the appointment query to cover all days that overlap
  const startZoned = toZonedTime(rangeStart, timezone);
  const endZoned = toZonedTime(rangeEnd, timezone);
  const queryStart = fromZonedTime(startOfDay(startZoned), timezone);
  const queryEnd = fromZonedTime(addDays(startOfDay(endZoned), 1), timezone);

  // Fetch appointments for the expanded range if needed
  const appointments =
    queryStart < rangeStart || queryEnd > rangeEnd
      ? await AppointmentModel.findByPractice(practice.id, queryStart, queryEnd)
      : existingAppointments;

  // Generate availability windows
  // Pass rangeStart as 'now' to show all availability in the requested range
  // (not clipped to server's current time)
  const availabilities = generateAvailabilities(
    timezone,
    rangeStart,
    rangeEnd,
    appointments.map((apt) => ({
      start_at: apt.start_at,
      end_at: apt.end_at,
      status: apt.status,
    })),
    rangeStart,
  );

  return NextResponse.json<AvailabilitySearchResponse>({ availabilities });
}
