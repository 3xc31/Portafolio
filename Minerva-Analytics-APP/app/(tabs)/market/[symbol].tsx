import { useMemo, useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Svg, Rect, Line, G } from 'react-native-svg';
import { doc, getDoc } from 'firebase/firestore';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { getQuote, type QuoteResponse, type HistoryResponse } from '../../../services/marketClient';
import { getHistoryByDateRange } from '../../../services/historyIndicators';
import { firestore, isFirebaseConfigured } from '../../../services/firebase';
import createScreenStyles from './symbol.styles';

const clpCurrencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const clpNumberFormatter = new Intl.NumberFormat('es-CL');

const formatCLP = (value?: number | null) =>
  typeof value === 'number' ? clpCurrencyFormatter.format(value) : 'N/A';

const formatCLPNumber = (value?: number | null) =>
  typeof value === 'number' ? clpNumberFormatter.format(value) : 'N/A';

const formatPercentValue = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const scaled = Math.abs(value) <= 1 ? value * 100 : value;
  const sign = scaled > 0 ? '+' : '';
  return `${sign}${scaled.toFixed(2)}%`;
};

const formatRatioValue = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';

const formatMarketCapValue = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? formatCLP(value) : '—';

const formatChangePercent = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

const demoCandles = [
  { time: '09:30', open: 120, high: 126, low: 118, close: 124, volume: 1500 },
  { time: '10:00', open: 124, high: 129, low: 122, close: 128, volume: 1500 },
  { time: '10:30', open: 128, high: 131, low: 125, close: 127, volume: 1500 },
  { time: '11:00', open: 127, high: 130, low: 123, close: 125, volume: 1500 },
  { time: '11:30', open: 125, high: 128, low: 121, close: 122, volume: 1500 },
  { time: '12:00', open: 122, high: 124, low: 118, close: 119, volume: 1500 },
  { time: '12:30', open: 119, high: 122, low: 115, close: 118, volume: 1500 },
  { time: '13:00', open: 118, high: 120, low: 114, close: 116, volume: 1500 },
];

const PRICE_CHART_HEIGHT = 240;
const VOLUME_CHART_HEIGHT = 80;
const CHART_PADDING = 16;
const CHART_GAP = 8;

type TKDoc = {
  AnnualReturn?: number;
  AnnualVolatility?: number;
  DebtToEquity?: number;
  DividendYield?: number;
  MarketCap?: number;
  PB?: number;
  PE?: number;
  ROE?: number;
  SharpeRatio?: number;
  Company?: string;
  Sector?: string;
};

export default function SymbolScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { symbol } = useLocalSearchParams<{ symbol?: string }>();
  const label = typeof symbol === 'string' ? symbol.toUpperCase() : 'ACCION';
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [hLoading, setHLoading] = useState(false);
  const [hError, setHError] = useState<string | null>(null);
  const [candlePx, setCandlePx] = useState(12);
  const [scrollX, setScrollX] = useState(0);
  const [cursor, setCursor] = useState<{ active: boolean; index: number | null; x: number }>({ active: false, index: null, x: 0 });
  const [chartInteracting, setChartInteracting] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [hScrollLocked, setHScrollLocked] = useState(false);
  const [scrollXAtPress, setScrollXAtPress] = useState<number | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState<TKDoc | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!label || label === 'ACCION') return;
      setLoading(true);
      setError(null);
      try {
        // Intentar con fallback para resolver sí­mbolos locales (ej. COPEC -> COPEC.SN)
        const q = await getQuote(label, { fallback: true });
        if (!cancelled) setQuote(q);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al obtener precio');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [label]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!label || label === 'ACCION') return;
      setHLoading(true);
      setHError(null);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 180); // Últimos ~6 meses
        const toYmd = (d: Date) => d.toISOString().slice(0, 10);
        const h = await getHistoryByDateRange(label, toYmd(start), toYmd(end));
        if (!cancelled) setHistory(h);
      } catch (e: any) {
        if (!cancelled) setHError(e?.message ?? 'Error al obtener historial');
      } finally {
        if (!cancelled) setHLoading(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [label]);

  useEffect(() => {
    if (!label || label === 'ACCION') {
      setAdditionalInfo(null);
      setInfoError(null);
      return;
    }
    let cancelled = false;
    async function loadInfo() {
      if (!isFirebaseConfigured || !firestore) {
        setAdditionalInfo(null);
        setInfoError('Firebase no está configurado.');
        return;
      }
      setInfoLoading(true);
      setInfoError(null);
      try {
        const ref = doc(firestore, 'TK', label);
        const snapshot = await getDoc(ref);
        if (cancelled) return;
        if (!snapshot.exists()) {
          setAdditionalInfo(null);
          setInfoError('No hay información adicional.');
        } else {
          setAdditionalInfo(snapshot.data() as TKDoc);
        }
      } catch (e: any) {
        if (!cancelled) {
          setAdditionalInfo(null);
          setInfoError(e?.message ?? 'Error al cargar información adicional');
        }
      } finally {
        if (!cancelled) {
          setInfoLoading(false);
        }
      }
    }
    loadInfo();
    return () => {
      cancelled = true;
    };
  }, [label]);

  const candles = (history?.data?.length ? history.data : demoCandles).filter(
    (c: any) =>
      typeof c.high === 'number' &&
      typeof c.low === 'number' &&
      typeof c.open === 'number' &&
      typeof c.close === 'number' &&
      typeof c.volume === 'number',
  );

  const selectedCandle = cursor.index != null ? candles[cursor.index] : null;

  const contentWidth = Math.max(CHART_PADDING * 2 + Math.max(candles.length, 1) * candlePx, screenWidth);
  const viewWidth = screenWidth;

  const firstVisibleIndex = Math.max(0, Math.floor(Math.max(scrollX, 0) / Math.max(candlePx, 1)) - 2);
  const visibleCount = Math.ceil(viewWidth / Math.max(candlePx, 1)) + 4;
  const lastVisibleIndex = Math.min(candles.length - 1, firstVisibleIndex + visibleCount);
  const visibleCandles = candles.slice(firstVisibleIndex, lastVisibleIndex + 1);

  const prices = visibleCandles
    .flatMap((item: any) => [item.high, item.low])
    .filter((p: any): p is number => typeof p === 'number');
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1;
  const lastPriceText = quote?.price != null ? formatCLP(quote.price) : 'N/A';
  const rangeText = `${formatCLP(minPrice)} - ${formatCLP(maxPrice)}`;

  const priceToY = (price: number) => {
    const normalized = (maxPrice - price) / priceRange;
    return CHART_PADDING + normalized * (PRICE_CHART_HEIGHT - CHART_PADDING * 2);
  };
  const sortedCandles = [...candles].sort((a, b) => {
    const timeA = typeof a.time === 'string' ? a.time : '';
    const timeB = typeof b.time === 'string' ? b.time : '';
    return timeA.localeCompare(timeB);
  });
  const latestCandle = sortedCandles[sortedCandles.length - 1];
  const prevCandle = sortedCandles.length > 1 ? sortedCandles[sortedCandles.length - 2] : null;
  const lastCloseDateText = latestCandle?.time
    ? new Date(latestCandle.time).toLocaleDateString()
    : '—';
  const changePercentValue =
    latestCandle && prevCandle && typeof latestCandle.close === 'number' && typeof prevCandle.close === 'number' && prevCandle.close !== 0
      ? ((latestCandle.close - prevCandle.close) / prevCandle.close) * 100
      : null;
  const changePercentText = formatChangePercent(changePercentValue);
  const companyDisplayName = additionalInfo?.Company ?? label;
  const latestClosePriceText = latestCandle?.close != null ? formatCLP(latestCandle.close) : '—';

  const additionalInfoFields = [
    { label: 'AnnualReturn', value: formatPercentValue(additionalInfo?.AnnualReturn) },
    { label: 'AnnualVolatility', value: formatPercentValue(additionalInfo?.AnnualVolatility) },
    { label: 'DebtToEquity', value: formatRatioValue(additionalInfo?.DebtToEquity) },
    { label: 'DividendYield', value: formatPercentValue(additionalInfo?.DividendYield) },
    { label: 'MarketCap', value: formatMarketCapValue(additionalInfo?.MarketCap) },
    { label: 'PB', value: formatRatioValue(additionalInfo?.PB) },
    { label: 'PE', value: formatRatioValue(additionalInfo?.PE) },
    { label: 'ROE', value: formatPercentValue(additionalInfo?.ROE) },
    { label: 'SharpeRatio', value: formatRatioValue(additionalInfo?.SharpeRatio) },
  ];

  const maxVolume = Math.max(...visibleCandles.map((c: any) => c.volume || 0), 1);
  const volToY = (v: number) => {
    const h = VOLUME_CHART_HEIGHT - CHART_PADDING;
    const ratio = Math.max(0, Math.min(1, v / maxVolume));
    return PRICE_CHART_HEIGHT + CHART_GAP + (VOLUME_CHART_HEIGHT - ratio * h) - CHART_PADDING;
  };

  const { colors } = useTheme();
  const mainStyles = useMemo(() => createMainStyles(colors), [colors]);
  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={screenStyles.content} scrollEnabled={!chartInteracting}>
      <View style={mainStyles.container}>
        <View style={screenStyles.nameHeader}>
          <View style={screenStyles.titleRow}>
            <Text style={[mainStyles.title, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
              {companyDisplayName}
            </Text>
            <Text style={screenStyles.lastPriceText}>{latestClosePriceText} CLP</Text>
          </View>
          <View style={screenStyles.symbolChangeGroup}>
            <View style={screenStyles.metaRow}>
              <Text style={screenStyles.symbolText}>{label}</Text>
              <Text style={screenStyles.metaDateText}>{lastCloseDateText}</Text>
              
            </View>
            <Text
                style={[
                  screenStyles.percentChange,
                  changePercentValue != null
                    ? changePercentValue >= 0
                      ? mainStyles.positive
                      : mainStyles.negative
                    : undefined,
                ]}
              >
                {changePercentText}
              </Text>
          </View>
        </View>
        <View style={screenStyles.card}>
          <View style={screenStyles.chartHeaderRow}>
            <Text
              style={[screenStyles.cardTitle, screenStyles.cardTitleShrink]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Gráfico de velas {history?.symbol ? `( ${history.symbol} )` : '(demo)'}
            </Text>
            <Pressable accessibilityLabel="Ayuda del gráfico" onPress={() => setHelpVisible(true)} style={screenStyles.helpBtn}>
              <Text style={screenStyles.helpBtnText}>?</Text>
            </Pressable>
          </View>
          <View style={screenStyles.zoomControls}>
            <Pressable
              onPress={() => setCandlePx((p) => Math.max(4, Math.round(p * 0.8)))}
              style={screenStyles.zoomBtn}>
              <Text style={screenStyles.zoomBtnText}>-</Text>
            </Pressable>
            <Text style={screenStyles.zoomLabel}>{`${Math.round((candlePx / 12) * 100)}%`}</Text>
            <Pressable
              onPress={() => setCandlePx((p) => Math.min(28, Math.round(p * 1.25)))}
              style={screenStyles.zoomBtn}>
              <Text style={screenStyles.zoomBtnText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={hScrollLocked ? 'Desbloquear desplazamiento horizontal' : 'Bloquear desplazamiento horizontal'}
              onPress={() => setHScrollLocked((v) => !v)}
              style={screenStyles.zoomBtn}>
              <Ionicons name={hScrollLocked ? 'lock-closed' : 'lock-open'} size={18} color={colors.text} />
            </Pressable>
          </View>
          {!!history?.inputSymbol && history.inputSymbol !== history.symbol && (
            <Text style={screenStyles.detailText}>Resuelto como: {history.symbol}</Text>
          )}
          {hLoading && (
            <View style={screenStyles.chartLoadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          {hError && <Text style={screenStyles.detailText}>No se pudo cargar historial: {hError}</Text>}
          <View style={{ width: '100%', height: PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + CHART_GAP }}>
            <ScrollView
              horizontal
              scrollEnabled={!hScrollLocked}
              showsHorizontalScrollIndicator={false}
              onScroll={({ nativeEvent }) => {
                const x = nativeEvent.contentOffset.x || 0;
                setScrollX(x);
                if (chartInteracting && touchX != null && scrollXAtPress != null) {
                  const localX = touchX + (x - scrollXAtPress);
                  const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((localX - CHART_PADDING) / Math.max(candlePx, 1))));
                  setCursor((c) => ({ ...c, index: idx }));
                }
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{ width: contentWidth }}
            >
              <Svg
                style={screenStyles.chart}
                height={PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + CHART_GAP}
                width={contentWidth}
                viewBox={`0 0 ${contentWidth} ${PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + CHART_GAP}`}
                onPressIn={(e: any) => {
                  const xLocal = e.nativeEvent?.locationX ?? 0;
                  const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((xLocal - CHART_PADDING) / Math.max(candlePx, 1))));
                  setTouchX(xLocal);
                  setScrollXAtPress(scrollX);
                  setCursor({ active: true, index: idx, x: xLocal });
                  setChartInteracting(true);
                }}
                onTouchMove={(e: any) => {
                  const xLocal = e.nativeEvent?.locationX ?? null;
                  if (xLocal == null) return;
                  setTouchX(xLocal);
                  const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((xLocal - CHART_PADDING) / Math.max(candlePx, 1))));
                  setCursor((c) => ({ ...c, index: idx, x: xLocal }));
                }}
                onPressOut={() => { setChartInteracting(false); setTouchX(null); setScrollXAtPress(null); }}
              >
                {candles.map((candle: any, index: number) => {
                  const x = CHART_PADDING + index * candlePx + candlePx / 2;
                  const lineY1 = priceToY(candle.high);
                  const lineY2 = priceToY(candle.low);
                  const rectY = priceToY(Math.max(candle.open, candle.close));
                  const rectHeight = Math.max(
                    priceToY(Math.min(candle.open, candle.close)) - rectY,
                    2,
                  );
                  const isBullish = candle.close >= candle.open;

                  return (
                    <G key={`${candle.time}-${index}`}>
                      <Line
                        x1={x}
                        x2={x}
                        y1={lineY1}
                        y2={lineY2}
                        stroke={colors.textMuted}
                        strokeWidth={2}
                      />
                      <Rect
                        x={x - candlePx / 2 + 4}
                        width={Math.max(2, candlePx - 8)}
                        y={rectY}
                        height={rectHeight}
                        fill={isBullish ? colors.positive : colors.negative}
                        rx={4}
                      />
                      {typeof candle.volume === 'number' && candle.volume > 0 && (
                        <Rect
                          x={x - Math.max(2, candlePx - 8) / 2}
                          width={Math.max(2, candlePx - 8)}
                          y={volToY(candle.volume)}
                          height={PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT - volToY(candle.volume)}
                          fill={colors.textMuted}
                          opacity={0.3}
                        />
                      )}
                    </G>
                  );
                })}

                {cursor.active && cursor.index != null && candles[cursor.index] && (
                  <G>
                    <Line
                      x1={CHART_PADDING + cursor.index * candlePx + candlePx / 2}
                      x2={CHART_PADDING + cursor.index * candlePx + candlePx / 2}
                      y1={0}
                      y2={PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + CHART_GAP}
                      stroke={colors.border}
                      strokeDasharray="4,4"
                    />
                  </G>
                )}
              </Svg>
            </ScrollView>

          </View>

          {cursor.active && selectedCandle && (
            <View style={screenStyles.tooltip}>
              <Text style={screenStyles.timeText}>{new Date(selectedCandle.time).toLocaleDateString()}</Text>
              <View style={screenStyles.tooltipGrid}>
                <View style={screenStyles.tooltipGridItem}>
                  <Text style={screenStyles.tooltipText}>Apertura: {formatCLP(selectedCandle.open)}</Text>
                </View>
                <View style={screenStyles.tooltipGridItem}>
                  <Text style={screenStyles.tooltipTextRight}>Cierre: {formatCLP(selectedCandle.close)}</Text>
                </View>
                <View style={screenStyles.tooltipGridItem}>
                  <Text style={screenStyles.tooltipText}>Más alto: {formatCLP(selectedCandle.high)}</Text>
                </View>
                <View style={screenStyles.tooltipGridItem}>
                  <Text style={screenStyles.tooltipTextRight}>Más bajo: {formatCLP(selectedCandle.low)}</Text>
                </View>
              </View>
              {typeof selectedCandle.volume === 'number' && (
                <Text style={screenStyles.volumeText}>Volumen: {formatCLPNumber(selectedCandle.volume)}</Text>
              )}
            </View>
          )}
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.cardTitle}>Información adicional</Text>
          <Text style={screenStyles.detailText}>Rango visible: {rangeText} CLP</Text>
          {infoLoading && <Text style={screenStyles.detailText}>Cargando información adicional…</Text>}
          {!infoLoading && infoError && <Text style={screenStyles.detailText}>{infoError}</Text>}
          {!infoLoading && !infoError && additionalInfo && (
            <View style={screenStyles.additionalInfoGrid}>
              {additionalInfoFields.map((item) => (
                <View key={item.label} style={screenStyles.additionalInfoItem}>
                  <Text style={screenStyles.additionalInfoLabel}>{item.label}</Text>
                  <Text style={screenStyles.additionalInfoValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={() => setInfoModalVisible(true)} style={{ marginTop: 8 }}>
            <Text style={[screenStyles.detailText, { color: colors.accent }]}>Qué significa cada campo</Text>
          </Pressable>
        </View>
      </View>
      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <View style={screenStyles.modalBackdrop}>
          <View style={screenStyles.modalCard}>
            <Text style={screenStyles.modalTitle}>Ayuda del gráfico</Text>
            <Text style={screenStyles.modalText}>Apertura: Precio de apertura de la acción al inicio del día</Text>
            <Text style={screenStyles.modalText}>Más alto: Precio máximo durnate del día</Text>
            <Text style={screenStyles.modalText}>Más bajo: Precio mínimo durnate el día</Text>
            <Text style={screenStyles.modalText}>Cierre: Precio de cierre de la acción al final del día</Text>
            <Text style={screenStyles.modalText}>Volumen: Volumen de acciones negociadas dentro del periodo de tiempo visible en el grafico</Text>
            <Text style={screenStyles.modalText}>Rango visible: Máximo y mínimo del rango mostrado</Text>
            <Text style={screenStyles.modalText}>-/+: Ajusta el tamaño de cada vela</Text>
            <Text style={screenStyles.modalText}>Candado: Bloquea o libera el desplazamiento horizontal</Text>
            <Pressable onPress={() => setHelpVisible(false)} style={screenStyles.modalCloseBtn}>
              <Text style={screenStyles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={screenStyles.modalBackdrop}>
          <View style={screenStyles.modalCard}>
            <Text style={screenStyles.modalTitle}>Información adicional</Text>
            <Text style={screenStyles.modalText}>AnnualReturn: Rentabilidad promedio anual obtenida por la acción</Text>
            <Text style={screenStyles.modalText}>AnnualVolatility: Nivel de variación del precio de la acción durante el año</Text>
            <Text style={screenStyles.modalText}>Company: Nombre de la empresa emisora de la acción</Text>
            <Text style={screenStyles.modalText}>DebtToEquity: Relación entre la deuda total y el patrimonio de la empresa</Text>
            <Text style={screenStyles.modalText}>DividendYield: Porcentaje anual de retorno entregado en forma de dividendos</Text>
            <Text style={screenStyles.modalText}>MarketCap: Valor total de mercado de la empresa según el precio de sus acciones</Text>
            <Text style={screenStyles.modalText}>PB: Relación entre el precio de la acción y su valor contable (Precio/Valor Libro)</Text>
            <Text style={screenStyles.modalText}>PE: Relación entre el precio de la acción y las utilidades anuales por acción (Precio/Utilidad)</Text>
            <Text style={screenStyles.modalText}>ROE: Rentabilidad obtenida sobre el patrimonio de los accionistas</Text>
            <Text style={screenStyles.modalText}>Sector: Categoría económica o industria a la que pertenece la empresa</Text>
            <Text style={screenStyles.modalText}>SharpeRatio: Medida de rentabilidad ajustada al riesgo; mayor valor indica mejor desempeño</Text>
            <Pressable onPress={() => setInfoModalVisible(false)} style={screenStyles.modalCloseBtn}>
              <Text style={screenStyles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
