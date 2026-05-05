import { getDialstack } from './dialstack';

/**
 * AI agent resolution helpers.
 *
 * `ensurePracticeAIAgent` is the page-time, write-capable path: it lists the
 * practice's AI agents, takes the first if any, and otherwise creates a
 * managed agent wired with this spineline's tool-call webhook URL. Spineline
 * owns the practice lifecycle, so a brand-new practice gets a working AI
 * receptionist on first visit.
 *
 * `getPracticeAIAgentSecret` is the read-only path used by the webhook
 * verifier. It never creates, so an unauthenticated caller posting an
 * invalid signature for a known account_id cannot trigger DialStack writes.
 *
 * No spineline-side cache: both values are fetched on demand. The page is
 * human-rate so saving a roundtrip on the agent ID isn't meaningful, and
 * caching the voice-app secret in spineline's DB would silently de-sync
 * the moment the secret is rotated or the voice app is recreated. Webhook-
 * rate callers (`spineline/lib/dialstack-webhook.ts`) memoize in-process.
 */
export interface ResolvedAIAgent {
  agentId: string;
  voiceAppSecret: string;
}

const MANAGED_AGENT_NAME = 'VoiceAI Agent';
const DEFAULT_PERSONA = 'Receptionist';
const DEFAULT_INSTRUCTIONS =
  'You are the AI receptionist for this practice. ' +
  'Help callers reach the right person, look up appointments, and book new visits. ' +
  'Never share patient information until you have verified the caller’s identity by phone number. ' +
  'For medical questions or dosage advice, take a message and tell the caller a clinician will call back.';

// Webhook URL DialStack will POST tool calls (lookup_customer, search_availability,
// book_appointment) to. Built from spineline's own public origin — without a
// stable origin we can't wire scheduling, so refuse to create an unusable agent.
function spinelineToolsWebhookUrl(): string {
  const origin = process.env.NEXTAUTH_URL;
  if (!origin) {
    throw new Error('NEXTAUTH_URL is not set; cannot derive AI agent scheduling webhook URL');
  }
  return `${origin.replace(/\/$/, '')}/api/dialstack/webhooks`;
}

/**
 * Page-time resolver: find the managed AI agent for the account by name,
 * otherwise create one wired with this spineline's tool-call webhook URL.
 *
 * Identity is by `name === MANAGED_AGENT_NAME`, matching the demo-data
 * convention in `api/internal/services/demo_ai_dialplan.go::demoAIAgentName`.
 * Demo-data also wires extension 900 + the AI Line dial plan to this agent,
 * so finding it by name returns a fully-routable receptionist. Admin-created
 * agents under a different name are ignored.
 */
export async function ensurePracticeAIAgent(dialstackAccountId: string): Promise<ResolvedAIAgent> {
  const dialstack = getDialstack();
  const accountOpts = { dialstackAccount: dialstackAccountId };

  const { data } = await dialstack.aiAgents.list({ limit: 100 }, accountOpts);
  let agent = data.find((a) => a.name === MANAGED_AGENT_NAME);
  if (!agent) {
    agent = await dialstack.aiAgents.create(
      {
        name: MANAGED_AGENT_NAME,
        persona_name: DEFAULT_PERSONA,
        instructions: DEFAULT_INSTRUCTIONS,
        scheduling: { webhook_url: spinelineToolsWebhookUrl() },
        faq_responses: [],
      },
      accountOpts
    );
  }

  const voiceApp = await dialstack.voiceApps.retrieve(agent.voice_app_id, accountOpts);
  return { agentId: agent.id, voiceAppSecret: voiceApp.secret };
}

/**
 * Read-only counterpart for the webhook verifier. Looks up the managed agent
 * by name and returns its voice-app secret, or `null` if the account has no
 * managed agent. Never creates — webhooks come in unauthenticated, and a
 * create-on-miss pre-auth would be an amplification path for forged
 * tool-call requests.
 */
export async function getPracticeAIAgentSecret(dialstackAccountId: string): Promise<string | null> {
  const dialstack = getDialstack();
  const accountOpts = { dialstackAccount: dialstackAccountId };

  const { data } = await dialstack.aiAgents.list({ limit: 100 }, accountOpts);
  const agent = data.find((a) => a.name === MANAGED_AGENT_NAME);
  if (!agent) return null;

  const voiceApp = await dialstack.voiceApps.retrieve(agent.voice_app_id, accountOpts);
  return voiceApp.secret;
}
