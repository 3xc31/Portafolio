import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import BackButton from '../../../components/BackButton';
import { useTheme } from '../../../contexts/ThemeContext';

export default function RealStateStack() {
  const { colors } = useTheme();

  const headerStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
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
        name="form"
        options={{
          headerShown: true,
          title: 'Simulador',
          headerLeft: () => (<BackButton color={colors.text} />),
        }}
      />
      <Stack.Screen
        name="saved"
        options={{
          headerShown: true,
          title: 'Guardadas',
          headerLeft: () => (<BackButton color={colors.text} />),
        }}
      />
      <Stack.Screen
        name="saved-detail"
        options={{
          headerShown: true,
          title: 'Detalle',
          headerLeft: () => (<BackButton color={colors.text} />),
        }}
      />
    </Stack>
  );
}
