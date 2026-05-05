'use client';

import { useEffect, useState } from 'react';
import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import { AIAgent } from '@dialstack/sdk/react';

type AIAgentStatus = 'loading' | 'ready' | 'error';

export default function AIReceptionistPage() {
  const [aiAgentId, setAiAgentId] = useState<string | null>(null);
  const [status, setStatus] = useState<AIAgentStatus>('loading');

  // Resolve (or create on first visit) the practice's AI agent. Spineline
  // owns the practice lifecycle; the backend auto-provisions an agent when
  // none exists, so the only states the UI cares about are ready vs error.
  useEffect(() => {
    async function fetchAIAgent() {
      try {
        const response = await fetch('/api/dialstack/ai-agent');
        if (response.ok) {
          const data = await response.json();
          setAiAgentId(data.agent_id);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Failed to fetch AI agent:', err);
        setStatus('error');
      }
    }

    fetchAIAgent();
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold">AI Receptionist</h1>
      <Container className="p-5">
        <EmbeddedComponentContainer componentName="AIAgent">
          {status === 'ready' && aiAgentId ? (
            <AIAgent agentId={aiAgentId} hideFields={['name']} />
          ) : status === 'error' ? (
            <p className="text-sm text-red-600">
              Could not load the AI receptionist. Please try again in a moment.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading AI receptionist...</p>
          )}
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
