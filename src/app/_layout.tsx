import {
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black_Italic,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { handleAuthUrl } from '@/lib/auth';
import { AppStateProvider } from '@/state/app-state';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // the logo font is bundled with the app, so this resolves almost instantly
  const [fontsLoaded, fontError] = useFonts({ BarlowCondensed_700Bold, BarlowCondensed_900Black_Italic });
  const ready = fontsLoaded || !!fontError;
  // sign-in links open the app with the session tokens in the URL
  const incomingUrl = Linking.useLinkingURL();
  useEffect(() => {
    void handleAuthUrl(incomingUrl);
  }, [incomingUrl]);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppStateProvider>
          {/* the header behind the status bar is always dark navy */}
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.light.header },
              headerTintColor: Colors.light.headerText,
              headerTitleStyle: { fontWeight: '700' },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="favoriti" options={{ title: 'Favoriti' }} />
            <Stack.Screen name="pretraga" options={{ title: 'Pretraga' }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="favorit/[id]" options={{ title: '' }} />
          </Stack>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
