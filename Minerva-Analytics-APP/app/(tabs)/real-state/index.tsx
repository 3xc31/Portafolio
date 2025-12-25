import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

const communeStats = [
  {
    name: 'Providencia',
    averagePrice: 9280,
    change: 4.2,
    listings: 180,
    coordinate: { latitude: -33.43333, longitude: -70.616666 },
  },
  {
    name: 'Las Condes',
    averagePrice: 11872,
    change: 5.7,
    listings: 240,
    coordinate: { latitude: -33.416666, longitude: -70.583333 },
  },
  {
    name: 'Ñuñoa',
    averagePrice: 6211,
    change: 3.5,
    listings: 200,
    coordinate: { latitude: -33.46666, longitude: -70.6 },
  },
  {
    name: 'Santiago Centro',
    averagePrice: 3100,
    change: 1.8,
    listings: 320,
    coordinate: { latitude: -33.45, longitude: -70.65 },
  },
  {
    name: 'La Florida',
    averagePrice: 3739,
    change: 2.1,
    listings: 150,
    coordinate: { latitude: -33.5333, longitude: -70.5667 },
  },
  {
    name: 'Vitacura',
    averagePrice: 5300,
    change: 6.3,
    listings: 95,
    coordinate: { latitude: -33.3948, longitude: -70.6231 },
  },
];

const REGION = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export default function RealStateScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const mainStyles = useMemo(() => createMainStyles(colors), [colors]);
  const screenStyles = useMemo(() => createScreenStyles(colors), [colors]);

  // Optional commune boundaries (MultiPolygon rings) loaded from Firestore
  type Boundary = {
    id: string;
    name: string;
    polygons: { latitude: number; longitude: number }[][];
  };
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [loadingBoundaries, setLoadingBoundaries] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBoundaries() {
      try {
        setLoadingBoundaries(true);
        const items: Boundary[] = [];
        // Try local GeoJSON first
        try {
          let gj: any;
          try {
            gj = require('../../../assets/geo/communes_rm.geojson');
          } catch {
            try {
              gj = require('../../../assets/geo/communes_rm.json');
            } catch {}
          }
          if (gj && Array.isArray(gj.features)) {
            gj.features.forEach((f: any, idx: number) => {
              const props = f?.properties || {};
              const name = (props.name || props.NOM_COM || props.COMUNA || `feature-${idx}`).toString();
              const geom = f?.geometry || {};
              const polygons: { latitude: number; longitude: number }[][] = [];
              if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
                (geom.coordinates as any[][][]).forEach((poly: any) => {
                  const outer = (poly?.[0] || []).map((pt: any) => ({ latitude: pt[1], longitude: pt[0] }));
                  if (outer.length) polygons.push(outer);
                });
              } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
                const outer = (geom.coordinates?.[0] || []).map((pt: any) => ({ latitude: pt[1], longitude: pt[0] }));
                if (outer.length) polygons.push(outer);
              }
              if (polygons.length) items.push({ id: props.id || `${name}-${idx}`, name, polygons });
            });
          }
        } catch {}

        if (items.length) {
          if (!cancelled) setBoundaries(items);
          return;
        }

        // Fallback to Firestore collection if local not available
        const { firestore: db, isFirebaseConfigured } = await import('../../../services/firebase');
        if (!isFirebaseConfigured || !db) return;
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'commune_boundaries'));
        if (cancelled) return;
        snap.forEach((doc) => {
          const d: any = doc.data();
          const name = (d?.name ?? doc.id ?? '').toString();
          let polys: { latitude: number; longitude: number }[][] = [];
          if (Array.isArray(d?.coordinates)) {
            try {
              polys = (d.coordinates as any[][][]).map((rings) => (rings?.[0] || rings).map((pt: any) => ({ latitude: pt[1], longitude: pt[0] })));
            } catch {}
          }
          if (!polys.length && Array.isArray(d?.polygons)) {
            polys = (d.polygons as any[][]).map((ring) => (ring || []).map((pt: any) => ({ latitude: pt.latitude ?? pt.lat, longitude: pt.longitude ?? pt.lng })));
          }
          if (polys.length) items.push({ id: doc.id, name, polygons: polys });
        });
        if (!cancelled) setBoundaries(items);
      } catch (e) {
        // ignore if collection not available
      } finally {
        if (!cancelled) setLoadingBoundaries(false);
      }
    }
    loadBoundaries();
    return () => { cancelled = true; };
  }, []);

  return (
    <ScrollView contentContainerStyle={screenStyles.content}>
      <View style={mainStyles.container}>
        <View style={screenStyles.headerRow}>
          <View>
            <Text style={mainStyles.title}>Mercado Inmobiliario</Text>
            <Text style={mainStyles.subtitle}>
              Valores promedio por comuna en la RM
            </Text>
          </View>
        </View>

        <View style={screenStyles.ctaRow}>
          <Pressable
            style={screenStyles.ctaChip}
            onPress={() => router.push('/(tabs)/real-state/form')}
          >
            <Text style={screenStyles.ctaChipText}>Calcular precio</Text>
          </Pressable>
          <Pressable
            style={screenStyles.ctaChip}
            onPress={() => router.push('/(tabs)/real-state/saved')}
          >
            <Text style={screenStyles.ctaChipText}>Ver simulaciones</Text>
          </Pressable>
        </View>

        <View style={screenStyles.mapCard}>
          <Text style={screenStyles.cardTitle}>Mapa interactivo</Text>
          <MapView style={screenStyles.map} initialRegion={REGION}>
            {boundaries.length > 0
              ? boundaries.map((b) => {
                  const stat = communeStats.find((c) => c.name.toLowerCase() === b.name.toLowerCase());
                  // centroid from first ring if needed
                  let centroid = stat?.coordinate as any;
                  if (!centroid && b.polygons[0]?.length) {
                    const ring = b.polygons[0];
                    const sum = ring.reduce((acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }), { lat: 0, lng: 0 });
                    centroid = { latitude: sum.lat / ring.length, longitude: sum.lng / ring.length } as any;
                  }
                  const isGrowth = (stat?.change ?? 0) >= 0;
                  const stroke = withAlpha(colors.text, 0.6);
                  const fill = withAlpha(isGrowth ? colors.positive : colors.negative, 0.12);
                  return (
                    <React.Fragment key={`b-${b.id}`}>
                      {b.polygons.map((ring, idx) => (
                        <Polygon key={`${b.id}-poly-${idx}`} coordinates={ring} strokeColor={stroke} strokeWidth={1} fillColor={fill} />
                      ))}
                      {centroid && stat && (
                        <Marker
                          key={`${b.id}-marker`}
                          coordinate={centroid}
                          title={stat.name}
                          description={`Promedio UF ${stat.averagePrice.toLocaleString('es-CL')}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              : communeStats.map((commune) => {
                  const isGrowth = commune.change >= 0;
                  // Fallback square ring around centroid
                  const d = 0.01;
                  const ring = [
                    { latitude: commune.coordinate.latitude + d, longitude: commune.coordinate.longitude - d },
                    { latitude: commune.coordinate.latitude + d, longitude: commune.coordinate.longitude + d },
                    { latitude: commune.coordinate.latitude - d, longitude: commune.coordinate.longitude + d },
                    { latitude: commune.coordinate.latitude - d, longitude: commune.coordinate.longitude - d },
                  ];
                  return (
                    <React.Fragment key={`fb-${commune.name}`}>
                      <Polygon
                        key={`${commune.name}-poly`}
                        coordinates={ring}
                        strokeColor={withAlpha(colors.text, 0.6)}
                        strokeWidth={1}
                        fillColor={withAlpha(isGrowth ? colors.positive : colors.negative, 0.12)}
                      />
                      <Marker
                        key={`${commune.name}-marker`}
                        coordinate={commune.coordinate}
                        title={commune.name}
                        description={`Promedio UF ${commune.averagePrice.toLocaleString('es-CL')}`}
                      />
                    </React.Fragment>
                  );
                })}
          </MapView>
        </View>

        <View style={screenStyles.card}>
          <Text style={screenStyles.cardTitle}>Resumen por comuna</Text>
          {communeStats.map((commune) => {
            const isGrowth = commune.change >= 0;
            const changeLabel = `${isGrowth ? '+' : ''}${commune.change.toFixed(1)}%`;

            return (
              <View key={commune.name} style={screenStyles.statRow}>
                <View style={screenStyles.statCopy}>
                  <Text style={screenStyles.statName}>{commune.name}</Text>
                </View>
                <View style={screenStyles.statValues}>
                  <Text style={screenStyles.statPrice}>
                    UF {commune.averagePrice.toLocaleString('es-CL')}
                  </Text>
                  <Text
                    style={[screenStyles.statDelta, isGrowth ? screenStyles.positive : screenStyles.negative]}
                  >
                    {changeLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 
        <Pressable
          style={screenStyles.primaryButton}
          onPress={() => router.push('/(tabs)/real-state/form')}
        >
          <Text style={screenStyles.primaryButtonText}>
            Ingresar datos de una vivienda especifica
          </Text>
        </Pressable>
        */}
      </View>
    </ScrollView>
  );
}

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 48,
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      //marginTop: 24,
    },
    ctaChip: {
      backgroundColor: colors.accentMuted,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ctaChipText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '600',
    },
    mapCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      marginTop: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    map: {
      width: '100%',
      height: 260,
      borderRadius: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 20,
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    statCopy: {
      flex: 1,
      gap: 4,
    },
    statName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    statMeta: {
      color: colors.textMuted,
      fontSize: 13,
    },
    statValues: {
      alignItems: 'flex-end',
      gap: 4,
    },
    statPrice: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    statDelta: {
      fontSize: 14,
      fontWeight: '600',
    },
    positive: {
      color: colors.positive,
    },
    negative: {
      color: colors.negative,
    },
    primaryButton: {
      marginTop: 28,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: '700',
    },
  });



