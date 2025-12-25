import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

type BackButtonProps = {
  color?: string;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function BackButton({
  color = '#000',
  size = 24,
  onPress,
  style,
  accessibilityLabel = 'Volver',
}: BackButtonProps) {
  const router = useRouter();
  const handlePress = onPress ?? (() => router.back());

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={[{ paddingHorizontal: 8, paddingVertical: 6 }, style]}
    >
      <Ionicons name="chevron-back" size={size} color={color} />
    </Pressable>
  );
}

