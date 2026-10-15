'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callPeerNumber, EmergencyBanner, useSoftphone } from '@dialstack/sdk-react/softphone';
import { ChevronDown, Mic, MicOff, Pause, Phone, PhoneOff, Play, Search, X } from 'lucide-react';
import type { Patient } from '@/app/models/patient';
import { patientFullName, patientInitials } from '@/lib/patientName';
import { normalizePatientPhone } from '@/lib/phone';
import { PatientCallCard } from '@/app/components/screen-pop/PatientCallCard';
import { useSoftphoneDrawer } from '@/app/hooks/SoftphoneDrawerProvider';
import { usePeekPatient } from '@/app/hooks/useLookupPatient';

// The in-call screen re-renders every second for its timer, and every render of
// the SDK's <CallHistory> inside the card reloads it, so skip renders whose
// props haven't changed. Drop this once that SDK wrapper stops reloading when
// it re-renders with the same props.
const StablePatientCallCard = memo(PatientCallCard);

type Call = NonNullable<ReturnType<typeof useSoftphone>['activeCall']>;

// The "custom" softphone: Spineline's own front-desk console, drawn on the SDK's
// useSoftphone() call state as an always-present bubble. Compare it with the
// drop-in <Softphone> in SoftphonePanel; both use the same provider and call.

const fetchPatients = async (): Promise<Patient[]> => {
  const res = await fetch('/api/patients');
  if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
  return res.json();
};

// Search on the last 10 digits, so "+15551230000" and "(555) 123-0000" match
// however they were typed.
const digits = (n: string) => n.replace(/\D/g, '').slice(-10);

function usePatients() {
  const { data } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  return data ?? [];
}

export function FloatingSoftphone() {
  const { enabled, style, open, setOpen } = useSoftphoneDrawer();
  const { activeCall, incomingCalls } = useSoftphone();
  // Closed, it's the shared SoftphoneBubble.
  if (!enabled || style !== 'floating' || !open) return null;

  const ringing = incomingCalls[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[640px] max-h-[calc(100vh-3rem)] w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-950 shadow-2xl dark:border-slate-800">
      <Header onCollapse={() => setOpen(false)} />
      {activeCall ? (
        // On a call, a second ringing call shows as a banner over it rather than
        // taking the panel, so the live call keeps its controls.
        <InCall call={activeCall} waiting={ringing} />
      ) : ringing ? (
        <Ringing call={ringing} />
      ) : (
        <Console />
      )}
    </div>
  );
}

function Header({ onCollapse }: { onCollapse: () => void }) {
  const { connection } = useSoftphone();
  const ready = connection === 'connected';
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <p className="flex-1 font-semibold tracking-tight">Front desk line</p>
      <span className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      <span className="text-sm text-muted-foreground">{ready ? 'Available' : connection}</span>
      <button
        type="button"
        aria-label="Minimize softphone"
        onClick={onCollapse}
        className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}

function Console() {
  const { dial } = useSoftphoneDrawer();
  const { connection, displayNumber, lastError, emergency } = useSoftphone();
  const patients = usePatients();
  const [query, setQuery] = useState('');
  // Saving an emergency address reconnects, which would drop a call placed meanwhile.
  const ready = connection === 'connected' && !emergency.submitting;
  const q = query.trim().toLowerCase();
  const dialable = !!normalizePatientPhone(q);

  const matches = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.phone &&
          (!q ||
            patientFullName(p).toLowerCase().includes(q) ||
            (!!digits(q) && digits(p.phone).includes(digits(q))))
      ),
    [patients, q]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The SDK's own E911 prompt: it shows only while a location is needed. */}
      <EmergencyBanner />
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && dialable && ready && dial(q)}
            placeholder="Find a patient or type a number"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button type="button" aria-label="Clear" onClick={() => setQuery('')}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {lastError && <p className="mt-2 text-sm text-destructive">{lastError.message}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {dialable && (
          <Row
            badge="#"
            title={`Call ${displayNumber(q)}`}
            meta="Not a patient on file"
            disabled={!ready}
            onCall={() => dial(q)}
          />
        )}
        <p className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {q ? 'Matching patients' : 'Patient directory'}
        </p>
        {matches.map((p) => (
          <Row
            key={p.id}
            badge={patientInitials(p)}
            title={patientFullName(p)}
            meta={displayNumber(p.phone!)}
            disabled={!ready}
            onCall={() => dial(p.phone!)}
          />
        ))}
      </div>
    </div>
  );
}

function Row(props: {
  badge: string;
  title: string;
  meta: string;
  disabled: boolean;
  onCall: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subdued text-sm font-semibold text-accent dark:bg-accent/20">
        {props.badge}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{props.title}</p>
        <p className="truncate text-xs text-muted-foreground">{props.meta}</p>
      </div>
      <button
        type="button"
        aria-label={`Call ${props.title}`}
        disabled={props.disabled}
        onClick={props.onCall}
        className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white disabled:opacity-40"
      >
        <Phone className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * The caller's patient card, the same one the drop-in drawer shows, fed by the
 * provider's lookup for this call (ringing or active).
 */
function Caller({ call }: { call: Call }) {
  const { callMatch, incomingMatches, setOpen } = useSoftphoneDrawer();
  const peekPatient = usePeekPatient();
  const keepOpen = useCallback(() => setOpen(true), [setOpen]);
  const number = callPeerNumber(call);
  const match =
    incomingMatches.find((m) => m.peer === number) ??
    (callMatch?.peer === number ? callMatch : null);
  // Between ringing and answered, neither list has the call for a render; the
  // cached lookup covers that gap so the card doesn't blink to loading.
  const cached = peekPatient(number);
  const patient = match && !match.isLoading ? match.patient : (cached ?? null);
  const isLoading = (match?.isLoading ?? true) && cached === undefined;
  return (
    <StablePatientCallCard
      fromNumber={number}
      patient={patient}
      isLoading={isLoading}
      onAction={keepOpen}
    />
  );
}

function Ringing({ call }: { call: Call }) {
  const { answerCall, actions } = useSoftphone();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground">
        <Phone className="h-4 w-4" /> Incoming call
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Caller call={call} />
      </div>
      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => actions.callActionsFor(call).reject()}
          className="flex-1 rounded-lg border border-destructive py-3 font-semibold text-destructive"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => answerCall(call)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white"
        >
          <Phone className="h-4 w-4" /> Answer
        </button>
      </div>
    </div>
  );
}

/** Who's on the other end of a call: the patient's name if one matched, else the number. */
function useCallLabel(call: Call) {
  const { callMatch, incomingMatches } = useSoftphoneDrawer();
  const { displayNumber } = useSoftphone();
  const peekPatient = usePeekPatient();
  const number = callPeerNumber(call);
  const patient =
    incomingMatches.find((m) => m.peer === number)?.patient ??
    (callMatch?.peer === number ? callMatch.patient : null) ??
    peekPatient(number);
  return patient ? patientFullName(patient) : displayNumber(number);
}

/** A compact row for a call that isn't the one on screen: a second caller, or one on hold. */
function OtherCall(props: { call: Call; status: string; children: React.ReactNode }) {
  const label = useCallLabel(props.call);
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50">
      <span className="min-w-0 flex-1 truncate">
        <span className="text-muted-foreground">{props.status} · </span>
        <span className="font-medium">{label}</span>
      </span>
      {props.children}
    </div>
  );
}

function InCall({ call, waiting }: { call: Call; waiting?: Call }) {
  const { actions, duration, heldCalls, answerCall, switchToCall } = useSoftphone();
  const held = call.state === 'held';
  const live = call.state === 'active';
  const onHold = heldCalls.filter((c) => c.id !== call.id);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white ${
          held ? 'bg-slate-500' : 'bg-emerald-600'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-white" />
        <span className="flex-1">{held ? 'On hold' : live ? 'On call' : 'Connecting…'}</span>
        {(live || held) && <span className="tabular-nums">{duration}</span>}
      </div>
      {waiting && (
        <OtherCall call={waiting} status="Incoming">
          <button
            type="button"
            onClick={() => actions.callActionsFor(waiting).reject()}
            className="rounded-md border border-destructive px-2.5 py-1 text-xs font-semibold text-destructive"
          >
            Decline
          </button>
          {/* Answering holds the current call; it then shows as "On hold" below. */}
          <button
            type="button"
            onClick={() => answerCall(waiting)}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
          >
            Answer
          </button>
        </OtherCall>
      )}
      {onHold.map((c) => (
        <OtherCall key={c.id} call={c} status="On hold">
          <button
            type="button"
            onClick={() => switchToCall(c)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground"
          >
            Resume
          </button>
        </OtherCall>
      ))}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Caller call={call} />
      </div>
      <div className="flex gap-2 border-t border-slate-200 px-3 pt-3 dark:border-slate-800">
        <Tool
          label={call.isMuted ? 'Muted' : 'Mute'}
          on={call.isMuted}
          onClick={actions.toggleMute}
          icon={call.isMuted ? MicOff : Mic}
        />
        <Tool
          label={held ? 'Resume' : 'Hold'}
          on={held}
          onClick={actions.toggleHold}
          icon={held ? Play : Pause}
        />
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={actions.hangup}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive py-3 font-semibold text-white"
        >
          <PhoneOff className="h-4 w-4" /> End call
        </button>
      </div>
    </div>
  );
}

function Tool(props: { label: string; on: boolean; onClick: () => void; icon: typeof Mic }) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      aria-pressed={props.on}
      onClick={props.onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-xs font-medium ${
        props.on ? 'bg-accent text-accent-foreground' : 'bg-slate-100 dark:bg-slate-800'
      }`}
    >
      <Icon className="h-5 w-5" />
      {props.label}
    </button>
  );
}
