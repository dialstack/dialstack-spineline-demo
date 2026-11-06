import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useShownCall } from '@c2c/hooks/useShownCall';
import { formatForDisplay } from '@c2c/phone';
import {
  clickToCall,
  controlCall,
  getMobileProfile,
  removeMobileNumber,
  setInboundToCell,
  setMobileNumber,
  type CallRecord,
  type CallVerb,
  type MobileProfile,
} from '@c2c/rig';

type ClickToCall = {
  /** undefined while loading. */
  profile: MobileProfile | undefined;
  /** The call placed from this app, until it is dismissed. */
  call: CallRecord | null;
  /** Asks, then rings the user's cell and connects them to `to`. */
  place: (to: string, name?: string) => void;
  control: (verb: CallVerb) => void;
  dismiss: () => void;
  saveNumber: (e164: string) => Promise<void>;
  removeNumber: () => Promise<void>;
  setInbound: (on: boolean) => Promise<void>;
};

const Context = createContext<ClickToCall | null>(null);

/**
 * The practice user's cell, and the call placed through it, for every tab.
 * Everything goes through the click-to-call rig, which holds the DialStack key.
 */
export function ClickToCallProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<MobileProfile | undefined>(undefined);
  const { call, dismiss } = useShownCall(userId);

  useEffect(() => {
    getMobileProfile(userId)
      .then(setProfile)
      .catch((err: Error) => {
        setProfile({ number: null, inbound: false });
        Alert.alert('Could not reach the click-to-call rig', err.message);
      });
  }, [userId]);

  const mobile = profile?.number ?? null;
  const place = useCallback(
    (to: string, name?: string) => {
      if (!mobile) {
        Alert.alert('Add your cell first', 'Calls ring your own phone, then connect.');
        router.navigate('/');
        return;
      }
      Alert.alert(
        `Call ${name ?? formatForDisplay(to)}?`,
        `We'll ring your phone at ${formatForDisplay(mobile)}. Answer to be connected.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              router.navigate('/');
              clickToCall(userId, to).catch((err: Error) =>
                Alert.alert('Call failed', err.message)
              );
            },
          },
        ]
      );
    },
    [mobile, router, userId]
  );

  const control = useCallback(
    (verb: CallVerb) => {
      controlCall(userId, verb).catch((err: Error) => Alert.alert('Couldn’t do that', err.message));
    },
    [userId]
  );

  const value = useMemo<ClickToCall>(
    () => ({
      profile,
      call,
      place,
      control,
      dismiss,
      saveNumber: async (e164) => setProfile(await setMobileNumber(userId, e164)),
      removeNumber: async () => setProfile(await removeMobileNumber(userId)),
      setInbound: async (on) => setProfile(await setInboundToCell(userId, on)),
    }),
    [profile, call, place, control, dismiss, userId]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useClickToCall(): ClickToCall {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useClickToCall must be used inside <ClickToCallProvider>');
  return ctx;
}
