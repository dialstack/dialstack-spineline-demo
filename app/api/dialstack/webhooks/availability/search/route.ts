import { NextRequest, NextResponse } from "next/server";
import {
  DialStack,
  AvailabilitySearchWebhook,
  AvailabilitySearchResponse,
  WebhookErrorResponse,
} from "@dialstack/sdk/server";
import PracticeModel from "@/app/models/practice";
import AppointmentModel from "@/app/models/appointment";

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

  // Generate available 15-minute slots (typical for chiropractic appointments)
  // Business hours: 9am-5pm (configurable in future)
  const SLOT_DURATION_MINUTES = 15;
  const BUSINESS_START_HOUR = 9;
  const BUSINESS_END_HOUR = 17;

  const availabilities: { start_at: string; duration_minutes: number }[] = [];

  // Iterate through each day in the range
  const currentDate = new Date(rangeStart);
  while (currentDate < rangeEnd) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Generate slots for this day
      const dayStart = new Date(currentDate);
      dayStart.setHours(BUSINESS_START_HOUR, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);

      let slotStart = new Date(dayStart);
      while (slotStart < dayEnd) {
        const slotEnd = new Date(
          slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000,
        );

        // Check if this slot conflicts with any existing appointment
        const hasConflict = existingAppointments.some((apt) => {
          const aptStart = new Date(apt.start_at);
          const aptEnd = new Date(apt.end_at);
          // Conflict if appointment overlaps with slot and is not cancelled/declined
          return (
            apt.status !== "cancelled" &&
            apt.status !== "declined" &&
            aptStart < slotEnd &&
            aptEnd > slotStart
          );
        });

        // Only include future slots that don't conflict
        const now = new Date();
        if (!hasConflict && slotStart > now) {
          availabilities.push({
            start_at: slotStart.toISOString(),
            duration_minutes: SLOT_DURATION_MINUTES,
          });
        }

        slotStart = slotEnd;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return NextResponse.json<AvailabilitySearchResponse>({ availabilities });
}
