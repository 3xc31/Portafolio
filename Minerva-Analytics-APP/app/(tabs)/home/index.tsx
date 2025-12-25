import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';

import { firestore, isFirebaseConfigured } from '../../../services/firebase';

import { createMainStyles } from '../../../constants/main_st.styles';
import { useTheme } from '../../../contexts/ThemeContext';

// Guías informativas: titulo, contenido, importancia, visible, orden
interface NewsArticle {
  title: string;
  url: string;
  image?: string;
  source?: string;
  description?: string;
}

interface TopTicker {
  symbol: string;
  annualReturn: number | null;
}

export default function Index() {
  const { colors } = useTheme();
  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const router = useRouter();

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTickers, setTopTickers] = useState<TopTicker[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | undefined>('');
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const { width } = Dimensions.get('window');
  const CARD_WIDTH = width - 48; // container has 24px horizontal padding
  const CARD_GAP = 12;
  const DESCRIPTION_MAX_LENGTH = 220;
  const SPACING = CARD_WIDTH + CARD_GAP;
  const scrollRef = useRef<ScrollView>(null);
  const tickerScrollRef = useRef<ScrollView>(null);

  const truncateText = (text: string | undefined, maxLen: number) => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1).trimEnd() + 'â€¦';
  };

  const formatPercentString = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    const scaled = Math.abs(value) <= 1 ? value * 100 : value;
    const sign = scaled > 0 ? '+' : '';
    return `${sign}${scaled.toFixed(2)}%`;
  };

  const getReturnColor = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return colors.textMuted;
    return value >= 0 ? colors.positive : colors.negative;
  };

  const TICKER_AUTO_SCROLL_INTERVAL = 4000;
  const API_URL = 'https://us-central1-minerva-analytics-602e8.cloudfunctions.net/get_global_economy_news';
  type FirstStepRoute = '/(tabs)/guides' | '/(tabs)/market' | '/(tabs)/real-state' | '/(tabs)/profile';
  const firstSteps: { title: string; description: string; route: FirstStepRoute }[] = [
    {
      title: 'Explora las guías',
      description: 'Aprende sobre el mercado bursátil e inmobiliario con contenido curado.',
      route: '/(tabs)/guides',
    },
    {
      title: 'Revisa el mercado',
      description: 'Consulta los últimos movimientos de las acciones chilenas.',
      route: '/(tabs)/market',
    },
    {
      title: 'Explora el inmobiliario',
      description: 'Analiza oportunidades de proyectos y propiedades en la región.',
      route: '/(tabs)/real-state',
    },
    {
      title: 'Configura tu perfil',
      description: 'Personaliza tu perfil y ajusta tus preferencias.',
      route: '/(tabs)/profile',
    },
  ];


  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data?.articles) setNews(data.articles.slice(0, 6));
      } catch (e) {
        console.error('Error al cargar noticias:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTopTickers() {
      if (!isFirebaseConfigured || !firestore) {
        setTopError('Firebase no está configurado.');
        setTopTickers([]);
        setTopLoading(false);
        return;
      }
      setTopLoading(true);
      setTopError(null);
      try {
        const q = query(collection(firestore, 'TK'), orderBy('AnnualReturn', 'desc'), limit(5));
        const snap = await getDocs(q);
        if (cancelled) return;
        const items = snap.docs.map((doc) => {
          const d = doc.data() as DocumentData;
          return {
            symbol: (d.Ticker || doc.id || '').toString(),
            annualReturn: typeof d.AnnualReturn === 'number' ? d.AnnualReturn : null,
          };
        });
        setTopTickers(items);
      } catch (e: any) {
        if (!cancelled) {
          setTopTickers([]);
          setTopError(e?.message ?? 'Error al cargar los líderes');
        }
      } finally {
        if (!cancelled) {
          setTopLoading(false);
        }
      }
    }
    loadTopTickers();
    return () => {
      cancelled = true;
    };
  }, []);

  const [marqueeWidth, setMarqueeWidth] = useState(0);
  const scrollOffset = useRef(0);

  useEffect(() => {
    if (topTickers.length === 0 || marqueeWidth <= 0) return;
    const step = 1;
    const interval = 16;
    const id = setInterval(() => {
      scrollOffset.current += step;
      if (scrollOffset.current >= marqueeWidth) {
        scrollOffset.current = 0;
      }
      tickerScrollRef.current?.scrollTo({ x: scrollOffset.current, animated: false });
    }, interval);
    return () => clearInterval(id);
  }, [topTickers.length, marqueeWidth]);

  useEffect(() => {
    scrollOffset.current = 0;
    tickerScrollRef.current?.scrollTo({ x: 0, animated: false });
    setMarqueeWidth(0);
  }, [topTickers.length]);

  // Posicionar el carrusel en el primer elemento real cuando hay clones
  useEffect(() => {
    if (news.length > 1) {
      setActiveIndex(0);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: SPACING, animated: false });
      }, 0);
    }
  }, [news.length, SPACING]);

  // Auto-scroll cada 8 segundos con looping
  useEffect(() => {
    if (news.length <= 1 || autoScrollPaused) return;
    const id = setInterval(() => {
      const nextReal = (activeIndex + 1) % news.length;
      const targetRaw = nextReal === 0 ? news.length + 1 : nextReal + 1; // usar clones para salto suave
      scrollRef.current?.scrollTo({ x: SPACING * targetRaw, animated: true });
    }, 8000);
    return () => clearInterval(id);
  }, [activeIndex, news.length, SPACING, autoScrollPaused]);

  const openArticle = (url: string, title?: string) => {
    setCurrentUrl(url);
    setCurrentTitle(title);
    setModalVisible(true);
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.tickerSection}>
        {topLoading ? (
          <View style={styles.tickerLoadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.tickerLoadingText}>Cargando líderes del mercado...</Text>
          </View>
        ) : topError ? (
          <Text style={styles.tickerErrorText}>{topError}</Text>
        ) : topTickers.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={tickerScrollRef}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            scrollEnabled={false}
          >
            <View
              style={styles.marqueeContent}
              onLayout={({ nativeEvent }) => setMarqueeWidth(nativeEvent.layout.width / 2)}
            >
              {[...topTickers, ...topTickers].map((ticker, index, arr) => (
                <View key={`${ticker.symbol}-${index}`} style={styles.marqueeItem}>
                  <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                  <Text style={[styles.tickerReturn, { color: getReturnColor(ticker.annualReturn) }]}>
                    {formatPercentString(ticker.annualReturn)}
                  </Text>
                  {/* 
                  {index < arr.length - 1 && <Text style={styles.tickerSeparator}>    —</Text>}
                  */}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.tickerErrorText}>No hay datos disponibles.</Text>
        )}
      </View>
      <Text style={styles.sectionTitle}>Últimas noticias</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsCarousel}
            snapToInterval={SPACING}
            decelerationRate="fast"
            snapToAlignment="start"
            ref={scrollRef}
            onTouchStart={() => setAutoScrollPaused(true)}
            onTouchEnd={() => setAutoScrollPaused(false)}
            onScrollBeginDrag={() => setAutoScrollPaused(true)}
            onScrollEndDrag={() => setAutoScrollPaused(false)}
            onMomentumScrollBegin={() => setAutoScrollPaused(true)}
            onMomentumScrollEnd={(e) => {
              if (news.length <= 1) return;
              const x = e.nativeEvent.contentOffset.x;
              const rawIdx = Math.round(x / SPACING);
              const lastIndex = news.length + 1; // incluye clones

              if (rawIdx === 0) {
                // En clon del Ãºltimo -> saltar al Ãºltimo real
                scrollRef.current?.scrollTo({ x: SPACING * news.length, animated: false });
                setActiveIndex(news.length - 1);
                setAutoScrollPaused(false);
                return;
              }

              if (rawIdx === lastIndex) {
                // En clon del primero -> saltar al primero real
                scrollRef.current?.scrollTo({ x: SPACING, animated: false });
                setActiveIndex(0);
                setAutoScrollPaused(false);
                return;
              }

              const realIdx = rawIdx - 1; // ajustar por clon inicial
              setActiveIndex(Math.max(0, Math.min(realIdx, news.length - 1)));
              setAutoScrollPaused(false);
            }}
          >
            {(news.length > 1
              ? [news[news.length - 1], ...news, news[0]]
              : news
            ).map((item, index, arr) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.newsCarouselCard,
                  { width: CARD_WIDTH, marginRight: index === arr.length - 1 ? 0 : CARD_GAP },
                ]}
                onPress={() => openArticle(item.url, item.title)}
                activeOpacity={0.9}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.newsCarouselImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.newsCarouselImage, { backgroundColor: colors.surfaceAlt }]} />
                )}
                <View style={styles.newsCarouselContent}>
                  <Text style={styles.newsCarouselTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.newsDots}>
            {news.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </View>
      )}

      <View>
        <Text style={styles.sectionTitle}>Primeros pasos</Text>
        <View style={styles.stepsContainer}>
          {firstSteps.map((step) => (
            <TouchableOpacity
              key={step.title}
              style={styles.stepCard}
              onPress={() => router.push(step.route)}
              accessibilityRole="button"
            >
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalHeaderSide}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {currentTitle || 'Noticia'}
            </Text>
            <View style={styles.modalHeaderSide} />
          </View>

          {currentUrl ? (
            <View style={{ flex: 1 }}>
              <WebView
                source={{ uri: currentUrl }}
                style={styles.webView}
                onLoadStart={() => setLoadingWeb(true)}
                onLoadEnd={() => setLoadingWeb(false)}
                startInLoadingState
              />
              {loadingWeb && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No se pudo cargar la noticia.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}









