import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensurePracticeAIAgent } from '@/lib/dialstack-ai-agent';

// Returns the DialStack AI agent ID for the signed-in practice. The voice
// page passes this into the SDK's <AIAgent /> component. The webhook signing
// secret is resolved as part of the same call but never returned to the
// client — it's resolved on demand by the tool-call webhook verifier.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.dialstackAccountId) {
      return new Response(JSON.stringify({ error: 'No authenticated user found' }), {
        status: 401,
      });
    }

    const { agentId } = await ensurePracticeAIAgent(session.user.dialstackAccountId);

    return new Response(JSON.stringify({ agent_id: agentId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log the detailed error server-side, but return a generic message to
    // the browser so we don't leak DialStack API error text or internal IDs.
    console.error('An error occurred while resolving the practice AI agent', error);
    return new Response(JSON.stringify({ error: 'failed_to_resolve_ai_agent' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
