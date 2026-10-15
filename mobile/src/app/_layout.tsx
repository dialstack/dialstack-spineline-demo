import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../auth';
import { colors, useBrandFonts } from '../theme';

// Hold the splash until Inter is in, rather than returning null from this layout:
// the navigator must mount on the first render, or expo-router's launch-URL
// handling updates a navigator that doesn't exist yet.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsReady = useBrandFonts();
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.offset } }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
