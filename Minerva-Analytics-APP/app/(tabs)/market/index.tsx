import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { createMainStyles } from '../../../constants/main_st.styles';
import { useTheme } from '../../../contexts/ThemeContext';
import { auth, firestore, isFirebaseConfigured } from '../../../services/firebase';
import { collection, getDocs, type DocumentData, doc, setDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import type { ThemeColors } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';

type TKDoc = {
  AnnualReturn?: number;
  AnnualVolatility?: number;
  Company?: string;
  DebtToEquity?: number;
  DividendYield?: number;
  MarketCap?: number;
  PB?: number;
  PE?: number;
  ROE?: number;
  Sector?: string;
  SharpeRatio?: number;
  Ticker?: string;
  Timestamp?: unknown;
};

type StockItem = {
  symbol: string;
  company: string;
  annualReturn?: number | null;
  sector?: string | null;
  dividendYield?: number | null;
  sharpe?: number | null;
};

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();

  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoritesSymbols, setFavoritesSymbols] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2400);
  };

  // Styled alert shim to match app aesthetics
  const Alert = {
    alert: (title: any, message?: any) => {
      const text = typeof message === 'string' && message.length ? message : String(title ?? '');
      const t = typeof title === 'string' ? title.toLowerCase() : String(title ?? '').toLowerCase();
      const type: 'success' | 'error' | 'info' =
        t.includes('error') || t.includes('no ') || t.includes('firebase') ? 'error' :
          t.includes('agregado') || t.includes('listo') ? 'success' : 'info';
      showToast(text, type);
    },
  } as const;

  const handleAddFavorite = async (stock: StockItem, e?: any) => {
    (e as any)?.stopPropagation?.();
    try {
      if (!isFirebaseConfigured || !firestore) {
        Alert.alert('Firebase no disponible', 'Revisa la configuración.');
        return;
      }
      const uid = auth?.currentUser?.uid || (session as any)?.userId;
      const email = auth?.currentUser?.email ?? null;
      if (!uid) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos.');
        return;
      }
      const docRef = doc(firestore, 'Favoritos', uid);
      const isFav = Array.isArray((favoritesSymbols)) && favoritesSymbols.includes(stock.symbol);
      if (isFav) {
        await setDoc(
          docRef,
          {
            symbols: arrayRemove(stock.symbol),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        Alert.alert('Eliminado', `${stock.symbol} eliminado de Favoritos.`);
      } else {
        await setDoc(
          docRef,
          {
            user: { uid, email },
            symbols: arrayUnion(stock.symbol),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        Alert.alert('Agregado', `${stock.symbol} agregado a Favoritos.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo agregar a Favoritos.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadStocks() {
      if (!isFirebaseConfigured || !firestore) {
        setError('Firebase no está configurado.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(firestore, 'TK'));
        if (cancelled) return;
        const data = snap.docs.map((doc): StockItem => {
          const d = doc.data() as DocumentData as TKDoc;
          return {
            symbol: (d.Ticker || doc.id || '').toString(),
            company: (d.Company || doc.id || '').toString(),
            annualReturn: typeof d.AnnualReturn === 'number' ? d.AnnualReturn : null,
            sector: d.Sector ?? null,
            dividendYield: typeof d.DividendYield === 'number' ? d.DividendYield : null,
            sharpe: typeof d.SharpeRatio === 'number' ? d.SharpeRatio : null,
          };
        });
        setStocks(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al cargar acciones');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStocks();
    return () => {
      cancelled = true;
    };
  }, []);

  // Suscribe favoritos del usuario para reflejar estado del icono
  useEffect(() => {
    if (!isFirebaseConfigured || !firestore) {
      setFavoritesSymbols([]);
      return;
    }
    const uid = session?.userId || auth?.currentUser?.uid;
    if (!uid) {
      setFavoritesSymbols([]);
      return;
    }
    const ref = doc(firestore, 'Favoritos', uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      try {
        const data = snap.data() as { symbols?: unknown } | undefined;
        const arr = Array.isArray(data?.symbols) ? (data!.symbols as unknown[]) : [];
        setFavoritesSymbols(arr.filter((x) => typeof x === 'string') as string[]);
      } catch {
        setFavoritesSymbols([]);
      }
    }, () => setFavoritesSymbols([]));
    return () => unsubscribe();
  }, [session?.userId]);

  const toPercent = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !isFinite(value)) return null;
    const scaled = Math.abs(value) <= 1 ? value * 100 : value;
    return scaled;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mercado chileno</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {loading && <Text style={styles.subtitle}>Cargando acciones…</Text>}
          {error && !loading && <Text style={styles.subtitle}>No se pudo cargar: {error}</Text>}
          {!loading && !error && stocks.map((stock) => {
            const pct = toPercent(stock.annualReturn);
            const changeStyle = typeof pct === 'number' && pct >= 0 ? styles.positive : styles.negative;
            const formattedChange =
              typeof pct === 'number'
                ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
                : '—';

            const dy = toPercent(stock.dividendYield);
            const metaRight = dy != null ? `Div ${dy.toFixed(2)}%` : stock.sharpe != null ? `Sharpe ${stock.sharpe.toFixed(2)}` : '';

            return (
              <Pressable
                key={stock.symbol}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/market/[symbol]',
                    params: { symbol: stock.symbol },
                  })
                }
              >
                <View style={styles.listItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.symbol}>{stock.symbol}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={[styles.change, changeStyle]}>{formattedChange}</Text>
                      <Pressable onPress={(e) => handleAddFavorite(stock, e)} hitSlop={8}>
                        <Ionicons name={favoritesSymbols.includes(stock.symbol) ? 'heart' : 'heart-outline'} size={20} color={colors.accent} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.company}>{stock.company}</Text>
                  <Text style={styles.meta}>
                    Sector {stock.sector ?? '—'}{metaRight ? ` | ${metaRight}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {toast && (
        <Pressable onPress={() => setToast(null)} style={screenStyles.toast} accessibilityRole="alert">
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : 'information-circle'}
            size={18}
            color={toast.type === 'success' ? colors.positive : toast.type === 'error' ? colors.negative : colors.accent}
          />
          <Text style={screenStyles.toastText}>{toast.message}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    toastText: {
      color: colors.text,
      fontSize: 14,
      flexShrink: 1,
    },
  });
