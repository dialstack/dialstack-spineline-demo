import { useEffect, useState } from 'react';
import { useSoftphone, type Call } from '@dialstack/sdk-native';

import { peerKey, peerNumber, resolvePatient, type PeerInfo } from '../caller';

/** Who a call is with, for Spineline's own screens: the patient behind its number. */
export function useCallerTitle(call: Call) {
  const { displayNumber } = useSoftphone();
  // The lookup's answer, tagged with the party it is for: still looking while
  // the tag differs, as after a transfer.
  const key = peerKey(call);
  const [resolved, setResolved] = useState<{ key: string; info: PeerInfo | null } | null>(null);

  useEffect(() => {
    let live = true;
    void resolvePatient(call).then((info) => live && setResolved({ key, info }));
    return () => {
      live = false;
    };
    // The key names the call and its number, all the lookup reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const looking = resolved?.key !== key;
  const info = looking ? null : resolved.info;
  const number = displayNumber(peerNumber(call));
  return {
    info,
    // True until the patient lookup settles, so a screen can wait to say "not on file".
    looking,
    number,
    title: info?.name ?? ((call.direction === 'inbound' && call.fromName) || number),
    initials: info?.avatar.initials ?? null,
  };
}
