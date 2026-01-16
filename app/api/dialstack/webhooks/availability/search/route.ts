import { NextRequest, NextResponse } from 'next/server';
import {
  DialStack,
  AvailabilitySearchWebhook,
  AvailabilitySearchResponse,
  WebhookErrorResponse,
} from '@dialstack/sdk/server';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, addDays } from 'date-fns';
import PracticeModel, { getTimezone } from '@/app/models/practice';
import AppointmentModel from '@/app/models/appointment';
import ProviderModel from '@/app/models/provider';
import { generateAvailabilities, unionAvailabilitySlots } from '@/lib/availability';

// POST /api/dialstack/webhooks/availability/search
// DialStack calls this endpoint to search for available appointment slots
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Parse webhook payload (with optional signature verification)
  let event: AvailabilitySearchWebhook;

  // Dev-only: bypass signature verification when DIALSTACK_WEBHOOK_SECRET is not set
  if (process.env.NODE_ENV === 'development' && !process.env.DIALSTACK_WEBHOOK_SECRET) {
    console.debug('[dev] Bypassing webhook signature verification');
    try {
      event = JSON.parse(body) as AvailabilitySearchWebhook;
    } catch {
      return NextResponse.json<WebhookErrorResponse>(
        {
          error: {
            code: 'invalid_payload',
            message: 'Invalid JSON payload',
          },
        },
        { status: 400 }
      );
    }
  } else {
    const webhookSecret = process.env.DIALSTACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('DIALSTACK_WEBHOOK_SECRET not configured');
      return NextResponse.json<WebhookErrorResponse>(
        {
          error: {
            code: 'configuration_error',
            message: 'Webhook not configured',
          },
        },
        { status: 500 }
      );
    }

    const signature = request.headers.get('x-dialstack-signature');

    if (!signature) {
      return NextResponse.json<WebhookErrorResponse>(
        {
          error: {
            code: 'invalid_signature',
            message: 'Missing signature header',
          },
        },
        { status: 401 }
      );
    }

    // Verify signature and parse webhook payload
    try {
      event = DialStack.webhooks.constructEvent<AvailabilitySearchWebhook>(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json<WebhookErrorResponse>(
        {
          error: {
            code: 'invalid_signature',
            message: 'Signature verification failed',
          },
        },
        { status: 401 }
      );
    }
  }

  // Find practice by DialStack account ID
  const practice = await PracticeModel.findByDialstackAccountId(event.account_id);
  if (!practice || !practice.id) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        error: {
          code: 'account_not_found',
          message: 'No practice linked to this account',
        },
      },
      { status: 404 }
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
    rangeEnd
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

  // Fetch all providers for this practice
  const providers = await ProviderModel.findAllByPractice(practice.id);

  // Helper to convert appointments to availability input format
  function toAvailabilityInput(apts: typeof appointments) {
    return apts.map((apt) => ({
      start_at: apt.start_at,
      end_at: apt.end_at,
      status: apt.status,
    }));
  }

  // Generate availability for each provider and union them
  // Any time where at least one provider is available is considered available overall
  let availabilities;

  if (providers.length === 0) {
    // No providers - fall back to practice-level availability (legacy behavior)
    availabilities = generateAvailabilities(
      timezone,
      rangeStart,
      rangeEnd,
      toAvailabilityInput(appointments),
      rangeStart
    );
  } else {
    // Group appointments by provider_id once (O(A) instead of O(P*A))
    // Appointments with NULL provider_id are ignored (don't block any provider)
    const appointmentsByProvider = new Map<number, typeof appointments>();
    for (const apt of appointments) {
      if (apt.provider_id !== null) {
        const list = appointmentsByProvider.get(apt.provider_id) ?? [];
        list.push(apt);
        appointmentsByProvider.set(apt.provider_id, list);
      }
    }

    // Generate per-provider availability and union them
    const providerAvailabilities = providers.map((provider) => {
      const providerAppointments = appointmentsByProvider.get(provider.id) ?? [];

      return generateAvailabilities(
        timezone,
        rangeStart,
        rangeEnd,
        toAvailabilityInput(providerAppointments),
        rangeStart
      );
    });

    // Union all provider availabilities
    availabilities = unionAvailabilitySlots(providerAvailabilities);
  }

  return NextResponse.json<AvailabilitySearchResponse>({ availabilities });
}
