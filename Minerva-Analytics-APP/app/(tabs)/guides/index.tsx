import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { createMainStyles } from '../../../constants/main_st.styles';
import { useTheme } from '../../../contexts/ThemeContext';
import { firestore, isFirebaseConfigured } from '../../../services/firebase';
import { collection, getDocs, type DocumentData } from 'firebase/firestore';
import { createGuidesStyles, GUIDE_HIT_SLOP } from './guides.styles';

interface Guia {
  titulo: string;
  contenido: string;
  importancia: string | number;
  visible: boolean;
  orden: number;
  etiquetas?: string[];
}

export default function GuidesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const gStyles = useMemo(() => createGuidesStyles(colors), [colors]);

  const [readGuides, setReadGuides] = useState<Record<number, boolean>>({});
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [selectedGuideIndex, setSelectedGuideIndex] = useState<number | null>(null);
  const [guides, setGuides] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadGuides() {
      if (!isFirebaseConfigured || !firestore) {
        setError('Firebase no está configurado.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(firestore, 'guias_informativas'));
        if (cancelled) return;
        const items = snap.docs.map((doc) => {
          const d = doc.data() as DocumentData & Partial<Guia>;
          return {
            titulo: String(d.titulo ?? ''),
            contenido: String(d.contenido ?? ''),
            importancia: d.importancia ?? '',
            visible: typeof d.visible === 'boolean' ? d.visible : true,
            orden: typeof d.orden === 'number' ? d.orden : Number(d.orden ?? 0),
            etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas.map((t: any) => String(t)) : [],
          } as Guia;
        });
        setGuides(items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al cargar guias');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadGuides();
    return () => {
      cancelled = true;
    };
  }, []);

  const guiasVisibles = useMemo(() => {
    return guides.filter((g) => g.visible).sort((a, b) => a.orden - b.orden);
  }, [guides]);

  const openGuide = (idx: number) => {
    setSelectedGuideIndex(idx);
    setGuideModalVisible(true);
  };

  const toggleRead = (idx: number) => {
    setReadGuides((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Guias informativas</Text>
      <Text style={gStyles.subtitle}>
        {loading ? 'Cargando guias…' : error ? `No se pudo cargar: ${error}` : 'Toca un titulo para ver detalles'}
      </Text>

      <View style={styles.list}>
        {guiasVisibles.map((g, i) => (
          <View
            key={`${g.titulo}-${i}`}
            style={[
              styles.listItem,
              gStyles.listRow,
            ]}
          >
            <TouchableOpacity
              style={gStyles.titleButton}
              onPress={() => openGuide(i)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir guia: ${g.titulo}`}
            >
              <Text style={[gStyles.title]} numberOfLines={1}>
                {g.titulo}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleRead(i)}
              accessibilityRole="button"
              accessibilityLabel={readGuides[i] ? 'Marcar como no leida' : 'Marcar como leida'}
              hitSlop={GUIDE_HIT_SLOP}
            >
              <Ionicons
                name={readGuides[i] ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={readGuides[i] ? colors.accent : colors.icon}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.spacerBottom} />

      <Modal
        visible={guideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideModalVisible(false)}
        onShow={() => {
          if (selectedGuideIndex !== null) {
            setReadGuides((prev) => ({ ...prev, [selectedGuideIndex]: true }));
          }
        }}
      >
        <View style={gStyles.overlay}>
          <Pressable style={gStyles.backdrop} onPress={() => setGuideModalVisible(false)} />
          <View style={gStyles.popupCard}>
            <Text style={gStyles.popupTitle}>
              {selectedGuideIndex !== null ? guiasVisibles[selectedGuideIndex]?.titulo : 'Guia'}
            </Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {selectedGuideIndex !== null ? (
                <View style={{ gap: 12 }}>
                  {!!guiasVisibles[selectedGuideIndex]?.etiquetas?.length && (
                    <View style={gStyles.chipsWrap}>
                      {guiasVisibles[selectedGuideIndex]?.etiquetas?.map((tag, idx) => (
                        <View key={`${tag}-${idx}`} style={gStyles.chip}>
                          <Text style={gStyles.chipText}>{String(tag)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={gStyles.paragraph}>
                    {guiasVisibles[selectedGuideIndex]?.contenido}
                  </Text>
                  <Text style={gStyles.importanceText}>
                    ¿Por qué es importante?: {String(guiasVisibles[selectedGuideIndex]?.importancia)}
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>No se pudo cargar la guia.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
