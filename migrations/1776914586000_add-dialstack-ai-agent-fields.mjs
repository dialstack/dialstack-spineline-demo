/**
 * Add per-practice DialStack AI agent wiring to the practices table.
 *
 * A practice operator creates an AI agent in the DialStack admin app, then
 * pastes the returned agent id and voice-app signing secret into the
 * spineline settings page. The secret is used to verify inbound tool-call
 * webhook signatures from the managed ai-agent service.
 */

export async function up(pgm) {
  pgm.addColumns('practices', {
    dialstack_ai_agent_id: { type: 'varchar(50)' },
    dialstack_voice_app_secret: { type: 'text' },
  });
}

export async function down(pgm) {
  pgm.dropColumns('practices', ['dialstack_ai_agent_id', 'dialstack_voice_app_secret']);
}
