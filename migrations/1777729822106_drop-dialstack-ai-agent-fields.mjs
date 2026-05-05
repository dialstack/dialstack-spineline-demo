/**
 * Drop the per-practice DialStack AI agent cache columns.
 *
 * `dialstack_ai_agent_id` and `dialstack_voice_app_secret` were a write-
 * through cache populated by the AI agent resolver. Caching the agent ID
 * saved no meaningful time (the resolver is page-rate) and caching the
 * voice-app secret created a second source of truth that went silently
 * stale on upstream rotation. The resolver now fetches both on demand
 * (with an in-process memo for the secret in the webhook verifier).
 */

export async function up(pgm) {
  pgm.dropColumns('practices', ['dialstack_ai_agent_id', 'dialstack_voice_app_secret']);
}

export async function down(pgm) {
  pgm.addColumns('practices', {
    dialstack_ai_agent_id: { type: 'varchar(50)' },
    dialstack_voice_app_secret: { type: 'text' },
  });
}
