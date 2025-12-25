import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { firestore, isFirebaseConfigured, auth } from '../../../services/firebase';
import { collection, getDocs, query, where, type DocumentData, deleteDoc, doc } from 'firebase/firestore';

type SimulationItem = {
  id: string;
  name: string;
  estimate: number | null;
  createdAt?: any;
  inputs?: {
    commune?: string;
    surface?: number;
    bedrooms?: number;
    bathrooms?: number;
    year?: number | null;
    pricePerM2?: number;
    ufm2?: number;
  };
};

export default function SavedSimulationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);

  const [items, setItems] = useState<SimulationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isFirebaseConfigured || !firestore) {
      setError('Firebase no está configurado.');
      return;
    }
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      setError('Debes iniciar sesión para ver tus simulaciones.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(firestore, 'real_state_simulations'),
        where('user.uid', '==', uid),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((dref) => {
        const d = dref.data() as DocumentData;
        return {
          id: dref.id,
          name: (d.name ?? dref.id ?? 'Simulación').toString(),
          estimate: typeof d.estimate === 'number' ? d.estimate : null,
          createdAt: d.createdAt,
          inputs: d.inputs ?? {},
        } as SimulationItem;
      });
      // Ordenar por fecha descendente localmente
      data.sort((a, b) => {
        const toMillis = (ts: any): number => {
          try {
            if (!ts) return 0;
            if (typeof ts.toMillis === 'function') return ts.toMillis();
            if (typeof ts.toDate === 'function') return ts.toDate().getTime();
            const dt = new Date(ts).getTime();
            return isNaN(dt) ? 0 : dt;
          } catch { return 0; }
        };
        return toMillis(b.createdAt) - toMillis(a.createdAt);
      });
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatEstimate = (value: number | null | undefined) =>
    typeof value === 'number' ? `$${Math.round(value).toLocaleString('es-CL')}` : '—';

  const formatDate = (ts: any) => {
    try {
      if (!ts) return '—';
      // Firestore Timestamp
      if (typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleString();
      }
      // ISO string/date
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toLocaleString();
      return '—';
    } catch {
      return '—';
    }
  };

  const confirmDelete = (item: SimulationItem) => {
    Alert.alert(
      'Eliminar simulación',
      `¿Seguro que quieres eliminar "${item.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(item) },
      ]
    );
  };

  const handleDelete = async (item: SimulationItem) => {
    if (!isFirebaseConfigured || !firestore) {
      Alert.alert('Firebase no disponible');
      return;
    }
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para eliminar.');
      return;
    }
    try {
      await deleteDoc(doc(firestore, 'real_state_simulations', item.id));
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Intenta nuevamente.');
    }
  };

  return (
    <ScrollView contentContainerStyle={screenStyles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Simulaciones guardadas</Text>
        {loading && <Text style={styles.subtitle}>Cargando…</Text>}
        {error && !loading && <Text style={styles.subtitle}>No disponible: {error}</Text>}
        {!loading && !error && items.length === 0 && (
          <View style={screenStyles.emptyState}>
            <Text style={styles.subtitle}>No hay simulaciones aún.</Text>
            <Pressable onPress={() => router.push('/(tabs)/real-state/form')}>
              <Text style={styles.button}>Crear una simulación</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && items.length > 0 && (
          <View style={styles.list}>
            {items.map((it) => (
              <Pressable key={it.id} onPress={() => router.push({ pathname: '/(tabs)/real-state/saved-detail', params: { id: it.id } })}>
                <View style={styles.listItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.symbol}>{it.name}</Text>
                    <Text style={styles.company}>{formatEstimate(it.estimate)}</Text>
                  </View>
                  <Text style={styles.company}>
                    {it.inputs?.commune ? `Comuna: ${it.inputs.commune}` : '—'}
                  </Text>
                  <Text style={styles.meta}>Creado: {formatDate(it.createdAt)}</Text>
                  <View style={screenStyles.actionsRow}>
                    <Pressable onPress={(e) => { (e as any)?.stopPropagation?.(); confirmDelete(it); }}>
                      <Text style={screenStyles.deleteText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loading && (
          <Pressable onPress={load} style={screenStyles.reloadBtn}>
            <Text style={screenStyles.reloadText}>Actualizar</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const createScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 48,
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    emptyState: {
      marginTop: 12,
      gap: 6,
    },
    reloadBtn: {
      marginTop: 16,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    reloadText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
    },
    deleteText: {
      color: colors.negative,
      fontSize: 14,
      fontWeight: '600',
    },
  });
