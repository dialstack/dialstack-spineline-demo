import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { SoftphoneProvider } from '@dialstack/sdk-native';

import { useAuth } from '../../auth';
import { CallProximity } from '../../CallProximity';
import { FollowCall } from '../../components/FollowCall';
import { audioOutput, bridge, phone } from '../../callBridge';
import { Icon, type IconName } from '../../components/TabIcon';
import { API_BASE_URL, sessionToken } from '../../config';
import { requestMicrophonePermission } from '../../permissions';
import { registerForWakePush } from '../../pushRegistration';
import { storage } from '../../storage';
import { colors, fonts, softphoneAppearance, useBrandFonts } from '../../theme';
import { UiModeProvider } from '../../uiMode';

function tabIcon(name: IconName) {
  return function TabBarIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} />;
  };
}

/** Everything behind sign-in. The softphone lives here so every tab can place a call. */
export default function AppLayout() {
  const { signedIn } = useAuth();
  const fontsReady = useBrandFonts();

  useEffect(() => {
    if (!signedIn) return;
    // Serially, not concurrently: Android's PermissionsAndroid serves one request
    // at a time and drops the second. Mic first so a woken call can take audio
    // without a mid-answer prompt.
    void (async () => {
      // Skip the probe when a call is already live (the usual way here is
      // answering a push-woken call): a second capture over CallKit/Telecom's
      // session costs the live call its mic.
      if (phone.activeCalls.length === 0) {
        const mic = await requestMicrophonePermission();
        console.log(`[perm] microphone ${mic ? 'granted' : 'not granted'}`);
      }
      await registerForWakePush((m) => console.log(`[push] ${m}`));
    })();
  }, [signedIn]);

  if (!signedIn) return <Redirect href="/login" />;
  // The splash is still up until then (see the root layout).
  if (!fontsReady) return null;

  // The UI adopts the process's phone (created in callBridge.ts); it never creates one.
  return (
    <SoftphoneProvider
      existingPhone={phone}
      token={sessionToken()}
      storage={storage}
      apiBaseUrl={API_BASE_URL}
      appearance={softphoneAppearance}
      // Dial through the bridge so an outbound call is reported to the OS and
      // survives backgrounding, like an incoming one.
      bridge={bridge}
      // Implied by the bridge: the app owns ringing, the audio session and the
      // proximity sensor (CallProximity).
      callAudio="host"
      audioOutput={audioOutput}
      onError={(e) => console.log(`[sdk] error ${e.code ?? '?'}: ${e.message ?? ''}`)}
    >
      <UiModeProvider>
        <CallProximity />
        <FollowCall />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.subdued,
            tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
            tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
            sceneStyle: { backgroundColor: colors.offset },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('home') }} />
          <Tabs.Screen
            name="patients"
            options={{ title: 'Patients', tabBarIcon: tabIcon('patients') }}
          />
          <Tabs.Screen name="phone" options={{ title: 'Phone', tabBarIcon: tabIcon('phone') }} />
        </Tabs>
      </UiModeProvider>
    </SoftphoneProvider>
  );
}
