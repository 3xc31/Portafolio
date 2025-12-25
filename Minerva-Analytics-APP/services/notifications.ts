import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { firestore, isFirebaseConfigured } from './firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

let configured = false;

// Mostrar banners también en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldSetBanner: true,
    shouldSetList: true,
    shouldShowAlert: true,
  }),
});

export async function ensurePushConfigured() {
  if (configured) return;
  // Permisos
  const perms = await Notifications.getPermissionsAsync();
  if (!perms.granted) {
    await Notifications.requestPermissionsAsync();
  }

  // Canal Android (alta prioridad)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('market-alerts', {
      name: 'Alertas de mercado',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  configured = true;
}

export async function notifyMarketAlert(params: {
  symbol: string;
  changePct: number;
  price: number | null;
  asOf?: string;
}) {
  const title = `Alerta: ${params.symbol}`;
  const bodyParts = [
    `${params.changePct >= 0 ? '+' : ''}${params.changePct.toFixed(2)}%`,
    params.price == null ? undefined : `Precio ${params.price}`,
  ].filter(Boolean);
  const body = bodyParts.join(' · ');

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: null,
        data: { type: 'market-alert', ...params },
      },
      trigger: null, // inmediata
    });
  } catch (e) {
    // Silencioso; en desarrollo puede fallar sin servicios nativos
  }
}

/**
 * Registra (o actualiza) el token de notificaciones del dispositivo del usuario
 * y lo guarda en Firestore bajo users/{uid}/pushTokens/{tokenId}.
 * - Prefiere Expo Push Token; si no está disponible, usa token de dispositivo (FCM/APNs).
 * - Retorna el token registrado (y su tipo) para debug.
 */
export async function registerPushToken(userId: string): Promise<{ token: string; kind: 'expo' | 'fcm' | 'apns' } | null> {
  try {
    await ensurePushConfigured();

    // Intentar Expo Push Token primero
    let expoToken: string | null = null;
    try {
      // En proyectos EAS, es recomendable pasar el projectId. Intentamos detectarlo.
      const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId
        || (Constants as any)?.easConfig?.projectId
        || undefined;
      const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined as any);
      expoToken = typeof res?.data === 'string' ? res.data : null;
    } catch {
      // Puede fallar en entornos sin EAS. Seguimos con token de dispositivo.
    }

    if (expoToken) {
      if (isFirebaseConfigured && firestore) {
        const ref = doc(collection(firestore, 'users', userId, 'pushTokens'), expoToken);
        await setDoc(ref, {
          token: expoToken,
          kind: 'expo',
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return { token: expoToken, kind: 'expo' };
    }

    // Fallback: token de dispositivo (Android => FCM; iOS => APNs)
    const dev = await Notifications.getDevicePushTokenAsync();
    const token = dev?.data;
    const kind = (dev?.type === 'fcm' ? 'fcm' : 'apns') as 'fcm' | 'apns';
    if (typeof token === 'string' && token.length > 0) {
      if (isFirebaseConfigured && firestore) {
        const ref = doc(collection(firestore, 'users', userId, 'pushTokens'), `${kind}:${token}`);
        await setDoc(ref, {
          token,
          kind,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return { token, kind };
    }

    return null;
  } catch {
    return null;
  }
}
