/**
 * Client helpers for the per-practice AI agent wiring config
 * (ai_agent_id + voice_app_secret used to verify tool-call webhooks).
 */

export interface AIAgentConfig {
  ai_agent_id: string;
  voice_app_secret_set: boolean;
}

export async function fetchAIAgentConfig(): Promise<AIAgentConfig> {
  const res = await fetch('/api/ai_agent_config', { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch AI agent config: ${res.status}`);
  return res.json();
}

export async function updateAIAgentConfig(input: {
  ai_agent_id?: string;
  voice_app_secret?: string;
}): Promise<void> {
  const res = await fetch('/api/ai_agent_config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update AI agent config: ${res.status}`);
}
