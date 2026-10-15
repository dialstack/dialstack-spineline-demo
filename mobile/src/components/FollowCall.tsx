import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSoftphone } from '@dialstack/sdk-native';

/**
 * Brings the Phone tab forward whenever a call rings or goes live, from any tab.
 * Driven by call state rather than onIncomingCall/onCallStarted, because a call
 * answered from the lock screen is already live when this UI first mounts and
 * those events have long fired.
 */
export function FollowCall(): null {
  const router = useRouter();
  const { incomingCalls, activeCall } = useSoftphone();
  const callId = incomingCalls[0]?.id ?? activeCall?.id ?? null;

  useEffect(() => {
    if (callId) router.navigate('/phone');
  }, [callId, router]);

  return null;
}
