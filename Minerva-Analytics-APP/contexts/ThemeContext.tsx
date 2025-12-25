import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, type ThemeColors, type ThemeName } from '../constants/theme';

type ThemeContextValue = {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const initialTheme: ThemeName = systemScheme === 'light' ? 'light' : 'dark';
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const STORAGE_KEY = 'minerva.theme';

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setThemeState(stored as ThemeName);
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, []);

  const setTheme = useCallback((nextTheme: ThemeName) => {
    setThemeState(nextTheme);
    // Persist selection (fire and forget)
    AsyncStorage.setItem(STORAGE_KEY, nextTheme).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      colors: Colors[theme],
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  // Keep root view background in sync (helps Android nav bar sampling)
  useEffect(() => {
    const bg = Colors[theme].background;
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
