import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../contexts/ThemeContext';
import type { ThemeColors } from '../constants/theme';
import { getQuote, type QuoteResponse } from '../services/marketClient';
import { ensurePushConfigured, notifyMarketAlert } from '../services/notifications';

type MarketBellProps = {
  /** Símbolo único a vigilar (por ejemplo: 'COPEC.SN'). */
  symbol?: string;
  /** Lista de símbolos a vigilar. Si se define, tiene prioridad sobre `symbol`. */
  symbols?: string[];
  /** Intervalo de sondeo en ms. */
  intervalMs?: number;
  /** Umbral en porcentaje para disparar alerta (ej: 0.5 = 0.5%). */
  thresholdPct?: number;
  /** Máximo de alertas acumuladas en el panel. */
  maxAlerts?: number;
  /** Callback opcional al abrir el panel. */
  onOpen?: () => void;
  /** Tamaño del ícono de campana. */
  size?: number;
  /** Color opcional del ícono. Por defecto usa colores del tema. */
  color?: string;
  /** Estilo adicional para el contenedor (útil si se integra en headers). */
  style?: any;
  /** Enviar notificaciones del sistema además del panel. */
  systemPush?: boolean;
};

type AlertItem = {
  id: string;
  symbol: string;
  price: number | null;
  changePct: number;
  asOf: string; // ISO
};

export default function MarketBell({
  symbol,
  symbols,
  intervalMs = 30000,
  thresholdPct = 0.5,
  maxAlerts = 20,
  onOpen,
  size = 24,
  color,
  style,
  systemPush = true,
}: MarketBellProps) {
  const { colors } = useTheme();

  const watchList = useMemo(() => {
    const list = symbols?.filter(Boolean) ?? (symbol ? [symbol] : []);
    // Deduplicar y normalizar a upper-case para consistencia
    return Array.from(new Set(list.map((s) => s.trim().toUpperCase())));
  }, [symbol, symbols]);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevPricesRef = useRef<Map<string, number | null>>(new Map());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  // Arranca/para el sondeo cuando cambian los símbolos
  useEffect(() => {
    // Configurar permisos/canal de notificaciones
    if (systemPush) {
      ensurePushConfigured().catch(() => {});
    }
  }, [systemPush]);

  // Arranca/para el sondeo cuando cambian los símbolos
  useEffect(() => {
    stopPolling();
    if (!watchList.length) return;
    // Sondeo inicial inmediato para evitar esperar al primer intervalo
    void pollOnce();
    pollingRef.current = setInterval(() => {
      void pollOnce();
    }, Math.max(5000, intervalMs));
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchList.join('|'), intervalMs, thresholdPct]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    runningRef.current = false;
  }, []);

  const pollOnce = useCallback(async () => {
    if (runningRef.current) return; // Evitar solapamiento
    runningRef.current = true;
    try {
      for (const sym of watchList) {
        try {
          const q: QuoteResponse = await getQuote(sym, { fallback: true });
          const prev = prevPricesRef.current.get(sym) ?? null;
          const curr = typeof q.price === 'number' ? q.price : null;
          prevPricesRef.current.set(sym, curr);

          if (prev != null && curr != null) {
            const changePct = ((curr - prev) / (prev === 0 ? 1 : prev)) * 100;
            if (Math.abs(changePct) >= thresholdPct) {
              pushAlert({ symbol: sym, price: curr, changePct, asOf: q.asOf });
            }
          }
        } catch (e) {
          // ignorar error de símbolo individual; continuar con el resto
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, [watchList, thresholdPct]);

  const pushAlert = useCallback(
    (data: { symbol: string; price: number | null; changePct: number; asOf: string }) => {
      setAlerts((prev) => {
        const next: AlertItem[] = [
          {
            id: `${data.symbol}-${data.asOf}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: data.symbol,
            price: data.price,
            changePct: data.changePct,
            asOf: data.asOf,
          },
          ...prev,
        ].slice(0, maxAlerts);
        return next;
      });
      setUnread((n) => n + 1);
      if (systemPush) {
        notifyMarketAlert({
          symbol: data.symbol,
          changePct: data.changePct,
          price: data.price,
          asOf: data.asOf,
        }).catch(() => {});
      }
    },
    [maxAlerts],
  );

  const toggle = useCallback(() => {
    setVisible((v) => {
      const nv = !v;
      if (nv && onOpen) onOpen();
      if (nv) setUnread(0);
      return nv;
    });
  }, [onOpen]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const bellColor = color ?? colors.icon;
  const hasAlerts = alerts.length > 0;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notificaciones de mercado"
        onPress={toggle}
        style={[styles.button, style]}
      >
        <Ionicons
          name={hasAlerts ? 'notifications-sharp' : 'notifications-outline'}
          size={size}
          color={bellColor}
        />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Alertas de mercado</Text>
              <Pressable onPress={() => setVisible(false)} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={22} color={colors.icon} />
              </Pressable>
            </View>
            {alerts.length === 0 ? (
              <Text style={styles.empty}>Sin alertas por ahora</Text>
            ) : (
              <View style={styles.list}>
                {alerts.map((a) => (
                  <View key={a.id} style={styles.item}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.symbol}>{a.symbol}</Text>
                      <Text style={[styles.change, a.changePct >= 0 ? styles.positive : styles.negative]}>
                        {a.changePct >= 0 ? '+' : ''}
                        {a.changePct.toFixed(2)}%
                      </Text>
                    </View>
                    <Text style={styles.meta}>
                      Precio {a.price == null ? '—' : a.price}
                      {'  •  '}
                      {formatTime(a.asOf)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return iso;
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      padding: 8,
    },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 3,
      borderRadius: 8,
      backgroundColor: colors.negative,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.surface,
    },
    badgeText: {
      color: colors.accentText,
      fontSize: 10,
      fontWeight: '700',
    },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.25)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    empty: {
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 20,
    },

    list: {
      gap: 10,
      maxHeight: 420,
    },
    item: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    symbol: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    change: {
      fontSize: 14,
      fontWeight: '600',
    },
    positive: {
      color: colors.positive,
    },
    negative: {
      color: colors.negative,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
    },
  });
