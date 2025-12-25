import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { firestore, isFirebaseConfigured, auth } from '../../../services/firebase';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '../../../contexts/ToastContext';

const currentYear = new Date().getFullYear();

type TipoInmueble = 'Terreno' | 'Casa' | 'Departamento';
type UsoTerreno = 'Residencial' | 'Comercial' | 'Mixto';
type ClaseEstructural = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
type CalidadNivel = 1 | 2 | 3 | 4 | 5; // 1 = mejor, 5 = peor
type EstadoConservacion = 'Excelente' | 'Normal' | 'Deficiente';

const regiones = ['Región Metropolitana'];
const comunasRM = [
  { name: 'Providencia', ufm2: 25.6 },
  { name: 'Las Condes', ufm2: 114.2 },
  { name: 'Ñuñoa', ufm2: 18.5 },
  { name: 'Santiago Centro', ufm2: 81.4 },
  { name: 'La Florida', ufm2: 70.4 },
  { name: 'Vitacura', ufm2: 99.5 },
];

const claseLabels: Record<ClaseEstructural, string> = {
  A: 'Acero',
  B: 'Hormigón',
  C: 'Albañilería',
  D: 'Madera',
  E: 'Mixta',
  F: 'Liviana',
  G: 'Adobe',
  H: 'Industrial',
  I: 'Otros',
};

const estadoOptions: EstadoConservacion[] = ['Excelente', 'Normal', 'Deficiente'];
const allCalidades: CalidadNivel[] = [1, 2, 3, 4, 5];

// Fallback sencillo si no hay Firebase o no hay datos
const makeScale = (corriente: number, regular: number, inferior: number): Record<CalidadNivel, number> => ({
  1: corriente + 2,
  2: corriente,
  3: regular,
  4: Math.round((regular + inferior) / 2),
  5: inferior,
});
const vubeFallbackByClass: Record<ClaseEstructural, Record<CalidadNivel, number>> = {
  A: makeScale(25, 22, 18),
  B: makeScale(24, 21, 17),
  C: makeScale(23, 20, 16),
  D: makeScale(20, 17, 14),
  E: makeScale(19, 16, 13),
  F: makeScale(18, 15, 12),
  G: makeScale(16, 13, 10),
  H: makeScale(18, 15, 12),
  I: makeScale(15, 12, 10),
};
const vubeFallbackValue = (clase: ClaseEstructural, calidad: CalidadNivel) =>
  vubeFallbackByClass[clase]?.[calidad] ?? 0;

// Incidencia por calidad (en %)
const incidenciaPorCalidadNivel: Record<CalidadNivel, number> = {
  1: 4.56,
  2: 4.0,
  3: 3.0,
  4: 2.5,
  5: 2.0,
};

export default function RealStateForm() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();

  const mainStyles = useMemo(() => createMainStyles(colors), [colors]);
  const formStyles = useMemo(() => createFormStyles(colors), [colors]);

  // Wizard
  const [step, setStep] = useState(0); // 0..4

  // Sección 1: Identificación general
  const [tipoInmueble, setTipoInmueble] = useState<TipoInmueble>('Casa');
  const [direccion, setDireccion] = useState('');
  const [region, setRegion] = useState(regiones[0]);
  const [comuna, setComuna] = useState(comunasRM[0].name);
  const [usoTerreno, setUsoTerreno] = useState<UsoTerreno>('Residencial');
  const [anioConstruccion, setAnioConstruccion] = useState<string>('2012');

  // Sección 2: VT
  const [superficieTerreno, setSuperficieTerreno] = useState<string>('0');
  // VUBM: mostramos UF/m2 de la comuna como referencia base de mercado
  const vubmUFm2 = useMemo(() => {
    const found = comunasRM.find((c) => c.name === comuna);
    return found ? found.ufm2 : 0;
  }, [comuna]);
  const [aplicarLimite500, setAplicarLimite500] = useState<boolean>(false);

  // Sección 3: VE
  const [superficieConstruida, setSuperficieConstruida] = useState<string>('0');
  const [claseEstructural, setClaseEstructural] = useState<ClaseEstructural>('A');
  const [calidad, setCalidad] = useState<CalidadNivel>(3);
  const [vubeUFm2, setVubeUFm2] = useState<number>(vubeFallbackValue('A', 3));
  const [vubeByQuality, setVubeByQuality] = useState<Record<CalidadNivel, number>>(vubeFallbackByClass['A']);
  const [condEspeciales, setCondEspeciales] = useState<readonly string[]>([]);
  const [estadoConservacion, setEstadoConservacion] = useState<EstadoConservacion>('Normal');
  const [coefDepAnual, setCoefDepAnual] = useState<number>(0.02);
  const [factorMercado, setFactorMercado] = useState<number>(0.78);
  const [usarFactorPorComuna, setUsarFactorPorComuna] = useState<boolean>(true);
  const [factoresComuna, setFactoresComuna] = useState<Record<string, number>>({});

  // Sección 4: VOC
  const [habilitarOC, setHabilitarOC] = useState<boolean>(false);
  const [obrasSeleccionadas, setObrasSeleccionadas] = useState<string[]>([]);
  const incidencia = useMemo(() => incidenciaPorCalidadNivel[calidad], [calidad]);

  // Sección 5: Resumen
  const [convertirCLP, setConvertirCLP] = useState<boolean>(false);
  const [valorUFclp, setValorUFclp] = useState<string>('36000');

  const edadReal = useMemo(() => {
    const builtYear = parseInt(anioConstruccion, 10);
    if (!Number.isFinite(builtYear)) return null;
    return Math.max(0, currentYear - builtYear);
  }, [anioConstruccion]);

  // Carga mapa de VUBE para la clase seleccionada
  useEffect(() => {
    let cancelled = false;
    async function loadVubeMap() {
      try {
        if (isFirebaseConfigured && firestore) {
          const ref = doc(firestore, 'VUBE', claseEstructural);
          const snap = await getDoc(ref);
          if (!cancelled && snap.exists()) {
            const data = snap.data() as any;
            const map = {
              1: typeof data?.['1'] === 'number' ? data['1'] : 0,
              2: typeof data?.['2'] === 'number' ? data['2'] : 0,
              3: typeof data?.['3'] === 'number' ? data['3'] : 0,
              4: typeof data?.['4'] === 'number' ? data['4'] : 0,
              5: typeof data?.['5'] === 'number' ? data['5'] : 0,
            } as Record<CalidadNivel, number>;
            setVubeByQuality(map);
            const dep = data?.['coef-depreciacion'];
            setCoefDepAnual(typeof dep === 'number' && isFinite(dep) ? Math.max(0, dep) : 0.02);
            return;
          }
        }
      } catch { }
      if (!cancelled) {
        setVubeByQuality(vubeFallbackByClass[claseEstructural]);
        setCoefDepAnual(0.02);
      }
    }
    loadVubeMap();
    return () => {
      cancelled = true;
    };
  }, [claseEstructural]);

  // Ajusta calidad si la actual queda bloqueada y sincroniza VUBE
  useEffect(() => {
    const curr = vubeByQuality[calidad] ?? 0;
    if (curr === 0) {
      const firstValid = allCalidades.find((q) => (vubeByQuality[q] ?? 0) > 0) ?? calidad;
      if (firstValid !== calidad) {
        setCalidad(firstValid);
        setVubeUFm2(vubeByQuality[firstValid] ?? 0);
      } else {
        setVubeUFm2(0);
      }
    } else {
      setVubeUFm2(curr);
    }
  }, [calidad, vubeByQuality]);

  // Guardado
  const [saveVisible, setSaveVisible] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const vtUF = useMemo(() => {
    const st = Math.max(0, parseFloat(superficieTerreno) || 0);
    const cap = tipoInmueble === 'Terreno' && aplicarLimite500 ? Math.min(st, 500) : st;
    const vt = cap * Math.max(0, vubmUFm2);
    return vt;
  }, [superficieTerreno, tipoInmueble, aplicarLimite500, vubmUFm2]);

  const conditionFactor = useMemo(() => {
    // +1% por cada condición seleccionada
    const count = condEspeciales.length;
    return 1 + Math.max(0, count) * 0.01;
  }, [condEspeciales]);

  // Inicializa/actualiza el factor por comuna cuando cambia la comuna o el global
  useEffect(() => {
    setFactoresComuna((prev) => {
      if (prev[comuna] == null) {
        return { ...prev, [comuna]: factorMercado };
      }
      return prev;
    });
  }, [comuna, factorMercado]);

  const factorMercadoAplicado = useMemo(() => {
    const base = usarFactorPorComuna ? (factoresComuna[comuna] ?? factorMercado) : factorMercado;
    const f = Number.isFinite(base) ? base : 1;
    // Acota entre 0 y 1 para convertir costo -> mercado (reducción)
    return Math.max(0, Math.min(1, f));
  }, [usarFactorPorComuna, factoresComuna, comuna, factorMercado]);

  const veUF = useMemo(() => {
    const sc = Math.max(0, parseFloat(superficieConstruida) || 0);
    const edad = Math.max(0, edadReal ?? 0);
    const depreciacion = Math.max(0, 1 - edad * Math.max(0, coefDepAnual));
    return sc * Math.max(0, vubeUFm2) * conditionFactor * depreciacion * factorMercadoAplicado;
  }, [superficieConstruida, vubeUFm2, conditionFactor, edadReal, coefDepAnual, factorMercadoAplicado]);

  const vocUF = useMemo(() => {
    if (tipoInmueble === 'Terreno') return 0;
    if (!habilitarOC) return 0;
    const inc = Math.max(0, incidencia) / 100;
    return veUF * inc;
  }, [tipoInmueble, habilitarOC, incidencia, veUF]);

  const totalUFBruto = useMemo(() => vtUF + veUF + vocUF, [vtUF, veUF, vocUF]);
  const totalUF = useMemo(() => totalUFBruto * factorMercado, [totalUFBruto, factorMercado]);
  const totalCLP = useMemo(() => {
    const tasa = Math.max(0, parseFloat(valorUFclp) || 0);
    return totalUF * tasa;
  }, [totalUF, valorUFclp]);

  const handleOpenSave = () => {
    if (!isFinite(totalUF) || totalUF <= 0) {
      Alert.alert('Sin resultados', 'Completa los datos para obtener una estimación.');
      return;
    }
    setSaveName('');
    setSaveVisible(true);
  };

  const handleSave = async () => {
    if (!isFirebaseConfigured || !firestore) {
      Alert.alert('Firebase no disponible', 'Firebase no está configurado. Revisa la configuración en app.json.');
      return;
    }
    const name = saveName.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la simulación.');
      return;
    }
    try {
      setSaving(true);
      await addDoc(collection(firestore, 'real_state_simulations'), {
        name,
        type: 'real-state',
        createdAt: serverTimestamp(),
        user: auth?.currentUser
          ? { uid: auth.currentUser.uid, email: auth.currentUser.email ?? null }
          : null,
        estimate: Math.round(totalCLP),
        inputs: {
          commune: comuna,
          surface: parseFloat(superficieConstruida) || 0,
          year: parseInt(anioConstruccion, 10) || null,
          ufm2: vubeUFm2,
          // Nuevos campos
          tipoInmueble,
          direccion,
          region,
          usoTerreno,
          vubm: vubmUFm2,
          claseEstructural,
          calidad,
          condiciones: condEspeciales,
          estadoConservacion,
          superficieTerreno: parseFloat(superficieTerreno) || 0,
          superficieConstruida: parseFloat(superficieConstruida) || 0,
          incidencia,
          habilitarOC,
          vtUF: Math.round(vtUF * 100) / 100,
          veUF: Math.round(veUF * 100) / 100,
          vocUF: Math.round(vocUF * 100) / 100,
          totalUF: Math.round(totalUF * 100) / 100,
          valorUFclp: parseFloat(valorUFclp) || 0,
          totalCLP: Math.round(totalCLP),
          coefDepreciacion: coefDepAnual,
          factorCondicion: conditionFactor,
          factorMercadoGlobal: factorMercado,
          usarFactorPorComuna,
          factorMercadoComuna: usarFactorPorComuna ? (factoresComuna[comuna] ?? factorMercado) : null,
          factorMercadoAplicado,
        },
      });
      setSaveVisible(false);
      Alert.alert('Listo', 'Simulación guardada.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar la simulación.');
    } finally {
      setSaving(false);
    }
  };

  const renderChipOptions = <T extends string | number>(
    current: T,
    options: readonly T[] | T[],
    onSelect: (v: T) => void,
    isDisabled?: (v: T) => boolean,
  ) => (
    <View style={formStyles.chipRow}>
      {options.map((opt) => {
        const isActive = opt === current;
        const disabled = isDisabled?.(opt) === true;
        return (
          <Pressable
            key={String(opt)}
            style={[formStyles.chip, isActive && formStyles.chipActive, disabled && formStyles.chipDisabled]}
            onPress={() => {
              if (!disabled) onSelect(opt);
            }}
            disabled={disabled}
          >
            <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>{String(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const toggleCond = (c: string) => {
    setCondEspeciales((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const obrasOpciones = ['Piscina', 'Cierre', 'Quincho', 'Terraza', 'Bodega'];
  const toggleObra = (o: string) => {
    setObrasSeleccionadas((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  };

  const formatUF = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('es-CL')} UF`;
  const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

  const disabledSteps = useMemo(() => {
    const set = new Set<number>();
    if (tipoInmueble === 'Terreno') {
      set.add(2); // skip VE for lands
      set.add(3); // skip VOC
    }
    if (tipoInmueble === 'Casa') {
      set.add(1); // skip VT for houses
    }
    if (tipoInmueble === 'Departamento') {
      set.add(1); // skip VT
      set.add(3); // skip VOC
    }
    return set;
  }, [tipoInmueble]);

  const allowedSteps = useMemo(() => [0, 1, 2, 3, 4].filter((idx) => !disabledSteps.has(idx)), [disabledSteps]);

  const goNext = () => {
    setStep((current) => {
      const idx = allowedSteps.indexOf(current);
      if (idx === -1) {
        return allowedSteps[0] ?? current;
      }
      return allowedSteps[Math.min(idx + 1, allowedSteps.length - 1)];
    });
  };

  const goPrev = () => {
    setStep((current) => {
      const idx = allowedSteps.indexOf(current);
      if (idx === -1) {
        return allowedSteps[0] ?? current;
      }
      return allowedSteps[Math.max(idx - 1, 0)];
    });
  };

  useEffect(() => {
    if (disabledSteps.has(step)) {
      setStep(allowedSteps[0] ?? 0);
    }
  }, [disabledSteps, allowedSteps, step]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={formStyles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ flex: 1 }}
      >
      <View style={mainStyles.container}>
        <View style={formStyles.header}>
          <Text style={mainStyles.title}>Simulador inmobiliario</Text>
          <Text style={mainStyles.subtitle}>Completa los pasos para estimar el valor.</Text>
        </View>

        {/* Stepper */}
        <View style={formStyles.stepper}>
          {allowedSteps.map((stepIndex, position) => {
            const currentProgress = allowedSteps.indexOf(step);
            const isCompleted = position <= (currentProgress === -1 ? 0 : currentProgress);
            const isActive = step === stepIndex;
            return (
              <View key={stepIndex} style={formStyles.stepSegment}>
                <View style={[formStyles.step, (isCompleted || isActive) && formStyles.stepActive]}>
                  <Text
                    style={[
                      formStyles.stepText,
                      (isCompleted || isActive) && formStyles.stepTextActive,
                    ]}
                  >
                    {position + 1}
                  </Text>
                </View>
                {position < allowedSteps.length - 1 && (
                  <View style={[formStyles.stepLine, isCompleted && formStyles.stepLineActive]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Sección 1: Identificación general */}
        {step === 0 && (
          <View style={formStyles.card}>
            <Text style={formStyles.cardTitle}>Identificación general</Text>
            <Text style={formStyles.label}>Tipo de inmueble</Text>
            {renderChipOptions<TipoInmueble>(
              tipoInmueble,
              ['Terreno', 'Casa', 'Departamento'],
              setTipoInmueble,
            )}

            <Text style={formStyles.label}>Dirección</Text>
            <TextInput
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Ej: Av. Siempre Viva 742"
              placeholderTextColor={colors.textMuted}
              style={formStyles.input}
            />

            <Text style={formStyles.label}>Región</Text>
            {renderChipOptions(region, regiones as any, setRegion as any)}
            <Text style={formStyles.label}>Comuna</Text>
            <View style={formStyles.chipRow}>
              {comunasRM.map((c) => {
                const isActive = c.name === comuna;
                return (
                  <Pressable
                    key={c.name}
                    style={[formStyles.chip, isActive && formStyles.chipActive]}
                    onPress={() => setComuna(c.name)}
                  >
                    <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={formStyles.label}>Uso del terreno</Text>
            {renderChipOptions<UsoTerreno>(usoTerreno, ['Residencial', 'Comercial', 'Mixto'], setUsoTerreno)}

            <Text style={formStyles.label}>Año de construcción</Text>
            <TextInput
              value={anioConstruccion}
              onChangeText={setAnioConstruccion}
              keyboardType="numeric"
              placeholder={`${currentYear - 10}`}
              placeholderTextColor={colors.textMuted}
              style={formStyles.input}
            />

            <View style={formStyles.switchRow}>
              <Text style={formStyles.label}>Usar factor por comuna</Text>
              <Switch value={usarFactorPorComuna} onValueChange={setUsarFactorPorComuna} />
            </View>

            <View style={formStyles.inlineFields}>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>
                  {usarFactorPorComuna ? `Factor mercado (${comuna})` : 'Factor mercado (global)'}
                </Text>
                <TextInput
                  value={(usarFactorPorComuna ? (factoresComuna[comuna] ?? factorMercado) : factorMercado).toString()}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!Number.isNaN(n)) {
                      if (usarFactorPorComuna) {
                        setFactoresComuna((prev) => ({ ...prev, [comuna]: n }));
                      } else {
                        setFactorMercado(n);
                      }
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="Ej: 0.78"
                  placeholderTextColor={colors.textMuted}
                  style={formStyles.input}
                />
                <Text style={formStyles.helper}>Rango 0.00–1.00; aplica sobre VE</Text>
              </View>
            </View>

            <View style={formStyles.navRow}>
              <View style={{ flex: 1 }} />
              <Pressable style={formStyles.primaryButton} onPress={goNext}>
                <Text style={formStyles.primaryButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Sección 2: Valor del Terreno (VT) */}
        {step === 1 && (
          <View style={formStyles.card}>
            <Text style={formStyles.cardTitle}>Valor del Terreno (VT)</Text>
            <Text style={formStyles.label}>Superficie del terreno (m²)</Text>
            <TextInput
              value={superficieTerreno}
              onChangeText={setSuperficieTerreno}
              keyboardType="numeric"
              placeholder="Ej: 300"
              placeholderTextColor={colors.textMuted}
              style={formStyles.input}
            />

            <View style={formStyles.inlineFields}>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>VUBM (UF/m²)</Text>
                <TextInput value={vubmUFm2.toString()} editable={false} style={[formStyles.input, formStyles.inputDisabled]} />
                <Text style={formStyles.helper}>Referencia según comuna seleccionada</Text>
              </View>
              {tipoInmueble === 'Terreno' && (
                <View style={[formStyles.inlineField, { justifyContent: 'center' }]}>
                  <View style={formStyles.switchRow}>
                    <Text style={formStyles.label}>Aplicar límite 500 m²</Text>
                    <Switch value={aplicarLimite500} onValueChange={setAplicarLimite500} />
                  </View>
                </View>
              )}
            </View>

            <View style={formStyles.navRow}>
              <Pressable style={formStyles.secondaryButton} onPress={goPrev}>
                <Text style={formStyles.secondaryButtonText}>Anterior</Text>
              </Pressable>
              <Pressable style={formStyles.primaryButton} onPress={goNext}>
                <Text style={formStyles.primaryButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Sección 3: Valor de la Edificación (VE) */}
        {step === 2 && (
          <View style={formStyles.card}>
            <Text style={formStyles.cardTitle}>Valor de la Edificación (VE)</Text>

            <Text style={formStyles.label}>Superficie construida (m²)</Text>
            <TextInput
              value={superficieConstruida}
              onChangeText={setSuperficieConstruida}
              keyboardType="numeric"
              placeholder="Ej: 120"
              placeholderTextColor={colors.textMuted}
              style={formStyles.input}
            />

            <View style={formStyles.inlineFields}>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>Clase estructural</Text>
                <View style={formStyles.chipRow}>
                  {(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as ClaseEstructural[]).map((c) => {
                    const isActive = c === claseEstructural;
                    return (
                      <Pressable
                        key={c}
                        style={[formStyles.chip, isActive && formStyles.chipActive]}
                        onPress={() => setClaseEstructural(c)}
                      >
                        <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={formStyles.helper}>{claseLabels[claseEstructural]}</Text>
              </View>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>Calidad de edificación</Text>
                {renderChipOptions<CalidadNivel>(
                  calidad,
                  allCalidades,
                  setCalidad,
                  (q) => (vubeByQuality[q as CalidadNivel] ?? 0) === 0,
                )}
                <Text style={formStyles.helper}>1 = mejor, 5 = peor</Text>
              </View>
            </View>

            <View style={formStyles.inlineFields}>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>VUBE (UF/m²)</Text>
                <TextInput value={vubeUFm2.toString()} editable={false} style={[formStyles.input, formStyles.inputDisabled]} />
                <Text style={formStyles.helper}>Autollenado (Firebase o valores de referencia)</Text>
              </View>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>Estado de conservación</Text>
                {renderChipOptions<EstadoConservacion>(estadoConservacion, estadoOptions, setEstadoConservacion)}
              </View>
            </View>

            <Text style={formStyles.label}>Condición especial (opcional)</Text>
            <View style={formStyles.chipRow}>
              {(['Mansarda', 'Subterráneo', 'Zócalo', 'Abierto'] as const).map((c) => {
                const isActive = condEspeciales.includes(c);
                return (
                  <Pressable key={c} style={[formStyles.chip, isActive && formStyles.chipActive]} onPress={() => toggleCond(c)}>
                    <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={formStyles.inlineFields}>
              <View style={formStyles.inlineField}>
                <Text style={formStyles.label}>Edad real</Text>
                <TextInput value={edadReal != null ? `${edadReal} años` : ''} editable={false} style={[formStyles.input, formStyles.inputDisabled]} />
              </View>
            </View>

            <View style={formStyles.navRow}>
              <Pressable style={formStyles.secondaryButton} onPress={goPrev}>
                <Text style={formStyles.secondaryButtonText}>Anterior</Text>
              </Pressable>
              <Pressable style={formStyles.primaryButton} onPress={goNext}>
                <Text style={formStyles.primaryButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Sección 4: Obras Complementarias (VOC) */}
        {step === 3 && (
          <View style={formStyles.card}>
            <Text style={formStyles.cardTitle}>Obras Complementarias (VOC)</Text>
            {tipoInmueble === 'Casa' ? (
              <>
                <View style={formStyles.switchRow}>
                  <Text style={formStyles.label}>Tiene obras complementarias</Text>
                  <Switch value={habilitarOC} onValueChange={setHabilitarOC} />
                </View>
                {habilitarOC && (
                  <>
                    <Text style={formStyles.label}>Tipo de obra (selección múltiple)</Text>
                    <View style={formStyles.chipRow}>
                      {obrasOpciones.map((o) => {
                        const isActive = obrasSeleccionadas.includes(o);
                        return (
                          <Pressable key={o} style={[formStyles.chip, isActive && formStyles.chipActive]} onPress={() => toggleObra(o)}>
                            <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>{o}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={formStyles.label}>Incidencia (%)</Text>
                    <TextInput value={incidencia.toString()} editable={false} style={[formStyles.input, formStyles.inputDisabled]} />
                    <Text style={formStyles.helper}>Autollenado por calidad (2.0–4.56%)</Text>
                  </>
                )}
              </>
            ) : (
              <Text style={formStyles.helper}>Esta sección no aplica para inmuebles rurales.</Text>
            )}

            <View style={formStyles.navRow}>
              <Pressable style={formStyles.secondaryButton} onPress={goPrev}>
                <Text style={formStyles.secondaryButtonText}>Anterior</Text>
              </Pressable>
              <Pressable style={formStyles.primaryButton} onPress={goNext}>
                <Text style={formStyles.primaryButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Sección 5: Resumen y Resultados */}
        {step === 4 && (
          <View style={formStyles.card}>
            <Text style={formStyles.cardTitle}>Resumen y Resultados</Text>
            <View style={formStyles.summaryRow}>
              <Text style={formStyles.label}>VT</Text>
              <Text style={formStyles.resultValue}>{formatUF(vtUF)}</Text>
            </View>
            <View style={formStyles.summaryRow}>
              <Text style={formStyles.label}>Factor mercado</Text>
              <Text style={formStyles.resultValue}>{factorMercadoAplicado.toFixed(2)}</Text>
            </View>
            <View style={formStyles.summaryRow}>
              <Text style={formStyles.label}>VE</Text>
              <Text style={formStyles.resultValue}>{formatUF(veUF)}</Text>
            </View>
            <View style={formStyles.summaryRow}>
              <Text style={formStyles.label}>VOC</Text>
              <Text style={formStyles.resultValue}>{formatUF(vocUF)}</Text>
            </View>
            <View style={formStyles.summaryRow}>
              <Text style={formStyles.label}>Total estimado</Text>
              <Text style={formStyles.resultValue}>{formatUF(totalUF)}</Text>
            </View>

            <View style={[formStyles.switchRow, { marginTop: 8 }]}>
              <Text style={formStyles.label}>Convertir a CLP</Text>
              <Switch value={convertirCLP} onValueChange={setConvertirCLP} />
            </View>

            {convertirCLP && (
              <>
                <Text style={formStyles.label}>Valor UF (CLP)</Text>
                <TextInput
                  value={valorUFclp}
                  onChangeText={setValorUFclp}
                  keyboardType="numeric"
                  placeholder="Ej: 36000"
                  placeholderTextColor={colors.textMuted}
                  style={formStyles.input}
                />
                <View style={formStyles.summaryRow}>
                  <Text style={formStyles.label}>Total CLP</Text>
                  <Text style={formStyles.resultValue}>{formatCLP(totalCLP)}</Text>
                </View>
              </>
            )}

            <View style={formStyles.navRow}>
              <Pressable style={formStyles.secondaryButton} onPress={goPrev}>
                <Text style={formStyles.secondaryButtonText}>Anterior</Text>
              </Pressable>
              <Pressable style={formStyles.primaryButton} onPress={handleOpenSave}>
                <Text style={formStyles.primaryButtonText}>Guardar simulación</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Modal visible={saveVisible} transparent animationType="fade" onRequestClose={() => setSaveVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={formStyles.modalBackdrop}>
          <View style={formStyles.modalCard}>
            <Text style={formStyles.modalTitle}>Guardar simulación</Text>
            <Text style={formStyles.label}>Nombre</Text>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder={`Ej: Vivienda ${comuna}`}
              placeholderTextColor={colors.textMuted}
              style={formStyles.input}
              autoFocus
            />
            <View style={formStyles.modalActions}>
              <Pressable onPress={() => setSaveVisible(false)} style={[formStyles.modalBtn, formStyles.modalBtnCancel]} disabled={saving}>
                <Text style={formStyles.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[formStyles.modalBtn, formStyles.modalBtnPrimary]} disabled={saving}>
                <Text style={formStyles.modalBtnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createFormStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 48,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    header: {
      gap: 8,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipDisabled: {
      opacity: 0.4,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
    },
    chipTextActive: {
      color: colors.accentText,
      fontWeight: '600',
    },
    helper: {
      color: colors.textMuted,
      fontSize: 13,
    },
    justifyText: {
      textAlign: 'justify',
    },
    fieldGroup: {
      gap: 8,
    },
    inlineFields: {
      flexDirection: 'row',
      gap: 12,
    },
    inlineField: {
      flex: 1,
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.inputText,
      fontSize: 16,
    },
    inputDisabled: {
      opacity: 0.7,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: colors.accentMuted,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    secondaryButtonText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '700',
    },
    resultValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stepper: {
      flexDirection: 'row',
      marginTop: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepSegment: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    step: {
      width: 28,
      height: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    stepActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    stepText: {
      color: colors.textMuted,
      fontWeight: '600',
      textAlign: 'center',
    },
    stepLine: {
      width: 32,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: 6,
    },
    stepLineActive: {
      backgroundColor: colors.accent,
    },
    stepTextActive: {
      color: colors.accentText,
    },
    navRow: {
      marginTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      width: '100%',
      maxWidth: 420,
      gap: 12,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
    },
    modalBtn: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
    },
    modalBtnCancel: {
      borderColor: colors.border,
    },
    modalBtnPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    modalBtnText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    modalBtnPrimaryText: {
      color: colors.accentText,
      fontSize: 14,
      fontWeight: '700',
    },
  });
