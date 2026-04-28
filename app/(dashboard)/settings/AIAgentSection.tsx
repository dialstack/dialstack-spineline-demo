'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import Container from '@/app/components/Container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AIAgentConfig, fetchAIAgentConfig, updateAIAgentConfig } from '@/lib/api/ai-agent-config';

// Settings section where a practice operator pastes the DialStack AI agent id
// and voice-app signing secret they copied from the admin app. Those values
// are required for spineline to verify inbound tool-call webhooks.
export default function AIAgentSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['aiAgentConfig'],
    queryFn: fetchAIAgentConfig,
  });

  const webhookBase = React.useMemo(
    () => (typeof window === 'undefined' ? '' : `${window.location.origin}/api/dialstack/webhooks`),
    []
  );

  return (
    <Container className="pl-5">
      <h1 className="mb-2 text-xl font-semibold">AI receptionist</h1>
      <p className="mb-4 max-w-2xl text-sm text-subdued">
        Create an AI agent in the DialStack admin app for this practice, then paste the agent id and
        the voice-app signing secret below. The secret is used to verify tool-call webhooks so the
        agent can look up patients, search availability, and book appointments on your behalf.
      </p>

      {webhookBase && (
        <div className="mb-4 text-sm">
          <div className="text-subdued">Webhook base URL</div>
          <code className="break-all font-mono text-xs">{webhookBase}</code>
          <div className="mt-1 text-xs text-subdued">
            Set this as <code>scheduling.webhook_url</code> on the AI agent in admin.
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2">
          <LoaderCircle className="animate-spin" size={16} />
          <span className="text-sm text-subdued">Loading...</span>
        </div>
      )}

      {error && <div className="text-sm text-red-600">Failed to load config</div>}

      {!isLoading && !error && data && <ConfigForm initial={data} />}
    </Container>
  );
}

function ConfigForm({ initial }: { initial: AIAgentConfig }) {
  const queryClient = useQueryClient();
  // Seed state once from the fetched data. A refetch changing the data would
  // not reset local edits — desirable, since the user may be mid-edit.
  const [agentId, setAgentId] = React.useState(initial.ai_agent_id);
  const [secret, setSecret] = React.useState('');

  const mutation = useMutation({
    mutationFn: updateAIAgentConfig,
    onSuccess: () => {
      setSecret('');
      queryClient.invalidateQueries({ queryKey: ['aiAgentConfig'] });
    },
  });

  const handleSave = () => {
    const payload: { ai_agent_id?: string; voice_app_secret?: string } = {
      ai_agent_id: agentId,
    };
    // Only send the secret when the user typed a new one — otherwise we'd
    // clobber the stored secret with empty on every save.
    if (secret.length > 0) payload.voice_app_secret = secret;
    mutation.mutate(payload);
  };

  const handleClearSecret = () => {
    // Clearing the secret takes the AI receptionist offline until a new one
    // is pasted in — add a speed bump so an accidental click doesn't cost
    // the operator their tool-call integration silently.
    if (
      !window.confirm(
        'Clear the signing secret? The AI receptionist will stop working until a new secret is configured.'
      )
    ) {
      return;
    }
    mutation.mutate({ voice_app_secret: '' });
  };

  return (
    <div className="flex flex-col gap-3 lg:max-w-md">
      <div>
        <Label htmlFor="ai-agent-id">AI agent ID</Label>
        <Input
          id="ai-agent-id"
          placeholder="aia_..."
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="voice-app-secret">Voice-app signing secret</Label>
        <Input
          id="voice-app-secret"
          type="password"
          placeholder={initial.voice_app_secret_set ? '•••••••• (saved)' : 'whsec_...'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="mt-1 font-mono"
        />
        <div className="mt-1 text-xs text-subdued">
          {initial.voice_app_secret_set
            ? 'A secret is stored. Enter a new value to replace it, or clear it below.'
            : 'Not set — tool-call webhooks will be rejected until configured.'}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        {initial.voice_app_secret_set && (
          <Button variant="outline" onClick={handleClearSecret} disabled={mutation.isPending}>
            Clear secret
          </Button>
        )}
      </div>

      {mutation.isError && <div className="text-sm text-red-600">Failed to save</div>}
    </div>
  );
}
