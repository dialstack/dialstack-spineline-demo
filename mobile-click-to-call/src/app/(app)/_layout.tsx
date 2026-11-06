import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@spineline/auth';
import { ClickToCallProvider } from '../../clickToCall';
import { Icon, type IconName } from '@spineline/components/TabIcon';
import { getDialstackUserId } from '../../storage';
import { colors, fonts, useBrandFonts } from '../../theme';

function tabIcon(name: IconName) {
  return function TabBarIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} />;
  };
}

/**
 * Everything behind sign-in. Unlike the in-app calling demo (../mobile) there
 * is no softphone here: this app never rings and carries no audio, so it needs
 * no microphone, push or OS call integration.
 */
export default function AppLayout() {
  const { signedIn } = useAuth();
  const fontsReady = useBrandFonts();
  const userId = getDialstackUserId();

  if (!signedIn || !userId) return <Redirect href="/login" />;
  if (!fontsReady) return null;

  return (
    <ClickToCallProvider userId={userId}>
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
        {/* The softphone is the app's main screen; Today and Patients feed it calls. */}
        <Tabs.Screen name="index" options={{ title: 'Phone', tabBarIcon: tabIcon('phone') }} />
        <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: tabIcon('home') }} />
        <Tabs.Screen
          name="patients"
          options={{ title: 'Patients', tabBarIcon: tabIcon('patients') }}
        />
      </Tabs>
    </ClickToCallProvider>
  );
}
