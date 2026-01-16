import { NextRequest, NextResponse } from 'next/server';
import {
  DialStack,
  CreateBookingWebhook,
  BookingResponse,
  WebhookErrorResponse,
} from '@dialstack/sdk/server';
import PracticeModel from '@/app/models/practice';
import AppointmentModel from '@/app/models/appointment';
import PatientModel from '@/app/models/patient';
import ProviderModel, { Provider } from '@/app/models/provider';
import { formatProviderNotes } from '@/lib/provider-utils';

// POST /api/dialstack/webhooks/bookings
// DialStack calls this endpoint to create a new booking
export async function POST(request: NextRequest) {
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

  // Get raw body and signature
  const body = await request.text();
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
  let event: CreateBookingWebhook;
  try {
    event = DialStack.webhooks.constructEvent<CreateBookingWebhook>(body, signature, webhookSecret);
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

  // Check for existing booking with same idempotency key (replay protection)
  const existingBooking = await AppointmentModel.findByIdempotencyKey(
    practice.id,
    event.idempotency_key
  );

  if (existingBooking) {
    // Look up provider for notes (if assigned)
    const existingProvider = existingBooking.provider_id
      ? await ProviderModel.findById(existingBooking.provider_id, practice.id)
      : null;

    // Return the existing booking (idempotent response)
    return NextResponse.json<BookingResponse>({
      booking: {
        id: String(existingBooking.id),
        status: existingBooking.status,
        start_at: existingBooking.start_at.toISOString(),
        end_at: existingBooking.end_at.toISOString(),
        customer:
          existingBooking.customer_name && existingBooking.customer_phone
            ? {
                phone: existingBooking.customer_phone,
                name: existingBooking.customer_name,
              }
            : undefined,
        notes: formatProviderNotes(existingProvider),
        created_at: existingBooking.created_at?.toISOString(),
      },
    });
  }

  // Calculate end time from start_at and duration_minutes
  const startAt = new Date(event.booking.start_at);
  const endAt = new Date(startAt.getTime() + event.booking.duration_minutes * 60 * 1000);

  // Find available providers at the requested time (single query)
  const availableProviders = await ProviderModel.findAvailableAtTime(practice.id, startAt, endAt);

  // Determine selected provider
  let selectedProvider: Provider | null = null;

  if (availableProviders.length === 0) {
    // Check if practice has any providers configured
    const allProviders = await ProviderModel.findAllByPractice(practice.id);

    if (allProviders.length === 0) {
      // No providers configured - fall back to legacy behavior (practice-level availability)
      const conflicts = await AppointmentModel.findConflicting(practice.id, startAt, endAt);
      if (conflicts.length > 0) {
        return NextResponse.json<WebhookErrorResponse>(
          {
            error: {
              code: 'slot_unavailable',
              message: 'The requested time slot is no longer available',
            },
          },
          { status: 409 }
        );
      }
    } else {
      // Providers exist but all are busy
      return NextResponse.json<WebhookErrorResponse>(
        {
          error: {
            code: 'slot_unavailable',
            message: 'No providers available at the requested time',
          },
        },
        { status: 409 }
      );
    }
  } else {
    // Select the least busy provider (first in list, sorted by appointment count)
    selectedProvider = availableProviders[0];
    console.log(
      `Selected provider ${selectedProvider.id} (${selectedProvider.first_name} ${selectedProvider.last_name}) from ${availableProviders.length} available`
    );
  }

  // Try to find an existing patient by phone number
  let patientId: number | null = null;
  if (event.booking.customer.phone) {
    const patient = await PatientModel.findByPhone(practice.id, event.booking.customer.phone);
    if (patient) {
      patientId = patient.id ?? null;
    }
  }

  // Build provider notes if a provider was selected
  const providerNotes = formatProviderNotes(selectedProvider);

  // Create the appointment
  const appointment = await AppointmentModel.create(practice.id, {
    start_at: startAt,
    end_at: endAt,
    status: 'accepted',
    patient_id: patientId,
    provider_id: selectedProvider?.id,
    customer_phone: event.booking.customer.phone,
    customer_name: event.booking.customer.name,
    customer_email: event.booking.customer.email,
    notes: event.booking.notes,
    idempotency_key: event.idempotency_key,
  });

  return NextResponse.json<BookingResponse>(
    {
      booking: {
        id: String(appointment.id),
        status: appointment.status,
        start_at: appointment.start_at.toISOString(),
        end_at: appointment.end_at.toISOString(),
        customer: {
          phone: event.booking.customer.phone,
          name: event.booking.customer.name,
        },
        notes: providerNotes,
        created_at: appointment.created_at?.toISOString(),
      },
    },
    { status: 201 }
  );
}
