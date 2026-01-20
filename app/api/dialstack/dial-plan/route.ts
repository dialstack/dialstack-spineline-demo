import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDialstack } from '@/lib/dialstack';
import type { DialPlanNode } from '@dialstack/sdk/server';

// Default business hours schedule: Monday-Friday 9am-5pm
const DEFAULT_SCHEDULE_RANGES = [
  { day: 1, start: '09:00', end: '17:00' },
  { day: 2, start: '09:00', end: '17:00' },
  { day: 3, start: '09:00', end: '17:00' },
  { day: 4, start: '09:00', end: '17:00' },
  { day: 5, start: '09:00', end: '17:00' },
];

// Fetch the DialStack dial plan for the current practice, creating it if it doesn't exist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.dialstackAccountId) {
      return new Response(
        JSON.stringify({
          error: 'No authenticated user found',
        }),
        { status: 401 }
      );
    }

    const accountId = session.user.dialstackAccountId;
    const dialstack = getDialstack();

    // Check if a dial plan already exists
    // Note: There's a small race condition window if concurrent requests arrive
    // when no dial plan exists. This is acceptable since Spineline is a demo app.
    const { data: dialPlans } = await dialstack.dialPlans.list(accountId, { limit: 1 });

    if (dialPlans.length > 0) {
      // Return existing dial plan ID
      return new Response(JSON.stringify({ dialPlanId: dialPlans[0].id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No dial plan exists - create one with default configuration

    // Step 1: Get or create a user for the routing target
    const { data: users } = await dialstack.users.list(accountId, { limit: 1 });
    let userId: string;

    if (users.length === 0) {
      const newUser = await dialstack.users.create(accountId, {
        email: session.user.email ?? undefined,
      });
      userId = newUser.id;
    } else {
      userId = users[0].id;
    }

    // Step 2: Create a default business hours schedule
    const schedule = await dialstack.schedules.create(accountId, {
      name: 'Business Hours',
      timezone: 'America/New_York',
      ranges: DEFAULT_SCHEDULE_RANGES,
      holidays: [],
    });

    // Step 3: Create the dial plan with schedule node routing to user/voicemail
    const nodes: DialPlanNode[] = [
      {
        id: 'check_hours',
        type: 'schedule',
        config: {
          schedule_id: schedule.id,
          open: 'reception',
          closed: 'voicemail',
          holiday: 'voicemail',
        },
      },
      {
        id: 'reception',
        type: 'internal_dial',
        config: {
          target_id: userId,
          timeout: 30,
          next: 'voicemail',
        },
      },
      {
        id: 'voicemail',
        type: 'internal_dial',
        config: {
          target_id: userId,
          timeout: 0, // timeout: 0 routes directly to voicemail without ringing
        },
      },
    ];

    const dialPlan = await dialstack.dialPlans.create(accountId, {
      name: 'Main Line',
      entry_node: 'check_hours',
      nodes,
    });

    return new Response(JSON.stringify({ dialPlanId: dialPlan.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('An error occurred when calling the DialStack API to fetch dial plan', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
