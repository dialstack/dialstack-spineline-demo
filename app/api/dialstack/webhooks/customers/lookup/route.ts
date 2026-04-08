import { NextRequest, NextResponse } from 'next/server';
import {
  DialStack,
  CustomerLookupWebhook,
  CustomerLookupResponse,
  WebhookErrorResponse,
} from '@dialstack/sdk/server';
import PracticeModel from '@/app/models/practice';
import PatientModel from '@/app/models/patient';
import AppointmentModel from '@/app/models/appointment';
import { normalizePhone } from '@/lib/phone';

// POST /api/dialstack/webhooks/customers/lookup
// DialStack calls this endpoint to look up a customer by phone number
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

  let event: CustomerLookupWebhook;
  try {
    event = DialStack.webhooks.constructEvent<CustomerLookupWebhook>(
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

  // Normalize phone to E.164 before lookup to match stored format
  const phone = normalizePhone(event.customer.phone) ?? event.customer.phone;

  // Look up patient by phone number
  const patient = await PatientModel.findByPhone(practice.id, phone);

  if (!patient) {
    return NextResponse.json<CustomerLookupResponse>({ found: false });
  }

  // Find the patient's next upcoming appointment (if any)
  const upcomingAppointment = await AppointmentModel.findNextUpcoming(practice.id, patient.id!);

  const response: CustomerLookupResponse = {
    found: true,
    customer: {
      name: `${patient.first_name} ${patient.last_name}`,
      phone: patient.phone ?? event.customer.phone,
      existing_appointment: upcomingAppointment
        ? {
            start_at: upcomingAppointment.start_at.toISOString(),
            end_at: upcomingAppointment.end_at.toISOString(),
            status: upcomingAppointment.status,
          }
        : undefined,
    },
  };

  return NextResponse.json<CustomerLookupResponse>(response);
}
