import { NextRequest, NextResponse } from 'next/server';
import { CustomerLookupWebhook, CustomerLookupResponse } from '@dialstack/sdk/server';
import PatientModel from '@/app/models/patient';
import AppointmentModel from '@/app/models/appointment';
import { normalizePhone } from '@/lib/phone';
import { verifyToolCallWebhook } from '@/lib/dialstack-webhook';

// POST /api/dialstack/webhooks/customers/lookup
// DialStack's ai-agent calls this endpoint to look up a customer by phone number.
export async function POST(request: NextRequest) {
  const verified = await verifyToolCallWebhook<CustomerLookupWebhook>(request);
  if (verified instanceof NextResponse) return verified;
  const { event, practice } = verified;

  // Normalize phone to E.164 before lookup to match stored format
  const phone = normalizePhone(event.customer.phone) ?? event.customer.phone;

  // Look up patient by phone number
  const patient = await PatientModel.findByPhone(practice.id!, phone);

  if (!patient) {
    return NextResponse.json<CustomerLookupResponse>({ found: false });
  }

  // Find the patient's next upcoming appointment (if any)
  const upcomingAppointment = await AppointmentModel.findNextUpcoming(practice.id!, patient.id!);

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
