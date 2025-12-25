import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { firestore, isFirebaseConfigured, auth } from '../../../services/firebase';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';

type SimulationDoc = {
  id: string;
  name: string;
  estimate: number | null;
  createdAt?: any;
  user?: { uid: string; email?: string | null } | null;
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

export default function SavedDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();

  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);

  const [item, setItem] = useState<SimulationDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const docId = typeof id === 'string' ? id : '';
      if (!docId) return;
      if (!isFirebaseConfigured || !firestore) {
        setError('Firebase no está configurado.');
        return;
      }
      const uid = auth?.currentUser?.uid;
      if (!uid) {
        setError('Debes iniciar sesión para ver la simulación.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const ref = doc(firestore, 'real_state_simulations', docId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('No encontrada');
          return;
        }
        const d = snap.data() as DocumentData;
        if (d?.user?.uid && d.user.uid !== uid) {
          setError('No tienes permisos para ver esta simulación.');
          return;
        }
        const result: SimulationDoc = {
          id: snap.id,
          name: (d.name ?? snap.id ?? 'Simulación').toString(),
          estimate: typeof d.estimate === 'number' ? d.estimate : null,
          createdAt: d.createdAt,
          user: d.user ?? null,
          inputs: d.inputs ?? {},
        };
        if (!cancelled) setItem(result);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const formatEstimate = (value: number | null | undefined) =>
    typeof value === 'number' ? `$${Math.round(value).toLocaleString('es-CL')}` : '—';

  const formatDate = (ts: any) => {
    try {
      if (!ts) return '—';
      if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
      const d = new Date(ts);
      return isNaN(d.getTime()) ? '—' : d.toLocaleString();
    } catch { return '—'; }
  };

  return (
    <ScrollView contentContainerStyle={screenStyles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Detalle de simulación</Text>
        {loading && <Text style={styles.subtitle}>Cargando…</Text>}
        {error && !loading && <Text style={styles.subtitle}>No disponible: {error}</Text>}
        {!loading && !error && item && (
          <View style={screenStyles.card}>
            <Text style={screenStyles.label}>Nombre</Text>
            <Text style={screenStyles.value}>{item.name}</Text>

            <Text style={screenStyles.label}>Estimación</Text>
            <Text style={screenStyles.value}>{formatEstimate(item.estimate)}</Text>

            <Text style={screenStyles.label}>Fecha</Text>
            <Text style={screenStyles.value}>{formatDate(item.createdAt)}</Text>

            <Text style={screenStyles.label}>Comuna</Text>
            <Text style={screenStyles.value}>{item.inputs?.commune ?? '—'}</Text>

            <Text style={screenStyles.label}>Superficie</Text>
            <Text style={screenStyles.value}>{item.inputs?.surface != null ? `${item.inputs.surface} m2` : '—'}</Text>

            <Text style={screenStyles.label}>Dormitorios / Baños</Text>
            <Text style={screenStyles.value}>
              {item.inputs?.bedrooms ?? '—'}D / {item.inputs?.bathrooms ?? '—'}B
            </Text>

            <Text style={screenStyles.label}>Año de construcción</Text>
            <Text style={screenStyles.value}>{item.inputs?.year ?? '—'}</Text>

            <Text style={screenStyles.label}>UF/m2 (ref.)</Text>
            <Text style={screenStyles.value}>{item.inputs?.ufm2 ?? '—'}</Text>
          </View>
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
    },
    value: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
    },
  });
