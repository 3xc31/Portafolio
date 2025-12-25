import { useMemo } from 'react';
import { Stack } from 'expo-router';
import BackButton from '../../../components/BackButton';

import { useTheme } from '../../../contexts/ThemeContext';

export default function MarketStack() {
  const { colors } = useTheme();

  const headerStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
    }),
    [colors],
  );

  const headerTitleStyle = useMemo(
    () => ({
      color: colors.text,
      fontWeight: 'bold' as const,
    }),
    [colors],
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle,
        headerTitleStyle,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Minerva Analytics' }} />
      <Stack.Screen
        name="[symbol]"
        options={{
          headerShown: true,
          title: 'Detalle',
          headerLeft: () => (<BackButton color={colors.text} />),
        }}
      />
    </Stack>
  );
}
