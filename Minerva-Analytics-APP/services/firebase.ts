import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


type ExpoExtra = typeof Constants.expoConfig extends { extra: infer T }
  ? T
  : Record<string, unknown>;

type FirebaseExtra = ExpoExtra extends { firebase?: infer T }
  ? T
  : Partial<FirebaseOptions>;

function readFirebaseConfig(): Partial<FirebaseOptions> | undefined {
  const expoConfig = Constants.expoConfig ?? (Constants.manifest as typeof Constants.expoConfig | null);
  const extra = expoConfig?.extra as ExpoExtra | undefined;
  if (!extra || typeof extra !== 'object') {
    return undefined;
  }
  const config = (extra as { firebase?: FirebaseExtra }).firebase;
  return config && typeof config === 'object' ? (config as Partial<FirebaseOptions>) : undefined;
}

function hasRequiredFields(config?: Partial<FirebaseOptions>): config is FirebaseOptions {
  if (!config) return false;
  const requiredKeys: Array<keyof FirebaseOptions> = ['apiKey', 'projectId', 'appId'];
  return requiredKeys.every((key) => {
    const value = config[key];
    return typeof value === 'string' && value.length > 0 && !value.startsWith('YOUR_FIREBASE_');
  });
}

const firebaseConfig = readFirebaseConfig();

let firebaseApp: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let auth: Auth | undefined;

if (hasRequiredFields(firebaseConfig)) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestore = getFirestore(firebaseApp);

  try {
    if (Platform.OS === 'web') {
      auth = getAuth(firebaseApp);
    } else {
      auth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch (e) {
    // Fallback a una instancia sin persistencia si algo falla
    auth = getAuth(firebaseApp);
    console.warn('Fallo al inicializar Auth con persistencia RN. Usando fallback en memoria.', e);
  }
} else {
  console.warn(
    'Firebase no esta configurado. Completa los valores en expo.extra.firebase en app.json para habilitar la integracion.',
  );
}

export const isFirebaseConfigured = Boolean(firebaseApp);
export { firebaseApp, firestore, auth };
