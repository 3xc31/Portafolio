import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, opts?: { type?: ToastType; durationMs?: number }) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [state, setState] = useState<ToastState>({ visible: false, message: '', type: 'info' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const show = useCallback((message: string, opts?: { type?: ToastType; durationMs?: number }) => {
    const type: ToastType = opts?.type ?? 'info';
    const duration = Math.max(800, opts?.durationMs ?? 2400);
    setState({ visible: true, message, type });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
      timerRef.current = null;
    }, duration);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (msg, durationMs) => show(msg, { type: 'success', durationMs }),
    error: (msg, durationMs) => show(msg, { type: 'error', durationMs }),
    info: (msg, durationMs) => show(msg, { type: 'info', durationMs }),
  }), [show]);

  const iconName = state.type === 'success' ? 'checkmark-circle' : state.type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = state.type === 'success' ? colors.positive : state.type === 'error' ? colors.negative : colors.accent;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {state.visible && (
        <Pressable onPress={hide} accessibilityRole="alert" style={[styles.toast, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
        }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
          <Text style={[styles.toastText, { color: colors.text }]}>{state.message}</Text>
        </Pressable>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toastText: {
    fontSize: 14,
    flexShrink: 1,
  },
});

