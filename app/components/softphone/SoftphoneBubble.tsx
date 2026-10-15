'use client';

import { useSoftphone } from '@dialstack/sdk-react/softphone';
import { Phone } from 'lucide-react';
import { useSoftphoneDrawer } from '@/app/hooks/SoftphoneDrawerProvider';

// The always-present way in, for both styles: it opens the drop-in drawer or the
// custom panel, whichever is chosen, and pulses while a call rings.
export function SoftphoneBubble() {
  const { enabled, open, setOpen } = useSoftphoneDrawer();
  const { activeCall, incomingCalls, duration } = useSoftphone();
  if (!enabled || open) return null;

  const ringing = incomingCalls.length > 0;
  const live = activeCall && (activeCall.state === 'active' || activeCall.state === 'held');

  return (
    <button
      type="button"
      aria-label="Open softphone"
      onClick={() => setOpen(true)}
      className={`fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full px-4 text-white shadow-xl transition ${
        ringing ? 'bg-emerald-600' : 'bg-accent'
      }`}
    >
      {ringing && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />}
      <Phone className="relative h-6 w-6" />
      {live && <span className="relative text-sm font-semibold tabular-nums">{duration}</span>}
    </button>
  );
}
