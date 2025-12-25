import { useEffect, useMemo } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { Alert as RNAlert } from 'react-native';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider, useToast } from '../contexts/ToastContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <ToastProvider>
            <ThemedStack />
          </ToastProvider>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}

function ThemedStack() {
  const { theme, colors } = useTheme();
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (initializing) return;
    const seg0 = segments[0] as unknown as string | undefined;
    const inAuthGroup = seg0 === '(auth)';
    const atRoot = (segments as unknown as string[]).length === 0;
    if (!session && !inAuthGroup) {
      router.replace({ pathname: '/(auth)/sign-in' as never });
    } else if (session && (inAuthGroup || atRoot)) {
      router.replace('/(tabs)/home');
    }
  }, [session, initializing, segments, router]);

  // Global override: funnel simple Alert.alert(title, message) to themed toast
  useEffect(() => {
    const original = RNAlert.alert;
    (RNAlert as any).alert = (
      title?: any,
      message?: any,
      buttons?: any,
      options?: any,
    ) => {
      try {
        if (Array.isArray(buttons) && buttons.length) {
          return original(title, message, buttons, options);
        }
        const text = typeof message === 'string' && message.length
          ? message
          : String(title ?? '');
        const t = (typeof title === 'string' ? title : String(title ?? '')).toLowerCase();
        const type = t.includes('error') || t.includes('no ') || t.includes('firebase')
          ? 'error'
          : t.includes('agregado') || t.includes('listo')
          ? 'success'
          : 'info';
        toast.show(text, { type: type as any });
      } catch {
        return original(title, message, buttons, options);
      }
    };
    return () => {
      (RNAlert as any).alert = original;
    };
  }, [toast]);

  const headerStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      shadowColor: colors.divider,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    }),
    [colors],
  );

  const headerTitleStyle = useMemo(
    () => ({
      fontWeight: 'bold' as const,
      color: colors.text,
    }),
    [colors],
  );

  // Keep Android navigation bar in sync with theme
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setBackgroundColorAsync(colors.background);
        await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
      } catch (e) {
        // ignore if not available in environment
      }
    })();
  }, [theme, colors.background]);

  return (
    <>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />
      <Stack
        screenOptions={{
          headerStyle,
          headerTintColor: colors.text,
          headerTitleStyle,
          headerTitleAlign: 'center',
          headerShown: true,
          contentStyle: { backgroundColor: colors.background },
          title: 'Minerva Analytics'
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
