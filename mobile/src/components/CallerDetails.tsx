import { useEffect, useState } from 'react';
import { useSoftphone, type Call } from '@dialstack/sdk-native';

import { resolvePatient, type PeerInfo } from '../caller';

// One lookup per call, shared by every screen that shows it.
const lookups = new Map<string, Promise<PeerInfo | null>>();

/** Who a call is with, for Spineline's own screens: the patient behind its number. */
export function useCallerTitle(call: Call) {
  const { displayNumber } = useSoftphone();
  // The lookup's answer, tagged with its call: still looking while the tag differs.
  const [resolved, setResolved] = useState<{ id: string; info: PeerInfo | null } | null>(null);

  useEffect(() => {
    let live = true;
    let lookup = lookups.get(call.id);
    if (!lookup) {
      lookup = resolvePatient(call).catch(() => null);
      lookups.clear(); // only the current call's lookup is needed
      lookups.set(call.id, lookup);
    }
    void lookup.then((info) => live && setResolved({ id: call.id, info }));
    return () => {
      live = false;
    };
    // A call's number never changes, so its id is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  const looking = resolved?.id !== call.id;
  const info = looking ? null : resolved.info;
  const number = displayNumber(call.direction === 'inbound' ? call.from : call.to);
  return {
    info,
    // True until the patient lookup settles, so a screen can wait to say "not on file".
    looking,
    number,
    title: info?.name ?? ((call.direction === 'inbound' && call.fromName) || number),
    initials: info?.avatar.initials ?? null,
  };
}
