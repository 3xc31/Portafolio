import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as firebaseAuth, isFirebaseConfigured } from '../services/firebase';

type Session = {
  userId: string;
  email?: string;
};

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = 'minerva.session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredSessionWeb(): Session | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function setStoredSessionWeb(session: Session | null) {
  if (Platform.OS !== 'web') return;
  try {
    if (session) {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors on web
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore session (web) and subscribe to Firebase Auth state
  useEffect(() => {
    // Quick restore for web; Firebase listener will overwrite if needed
    const restored = getStoredSessionWeb();
    if (restored) setSession(restored);

    if (isFirebaseConfigured && firebaseAuth) {
      const unsub = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          const next: Session = { userId: user.uid, email: user.email ?? undefined };
          setSession(next);
          setStoredSessionWeb(next);
          // Registrar token de notificaciones para este usuario (silencioso)
          /* import('../services/notifications')
            .then((m) => m.registerPushToken?.(user.uid))
            .catch(() => { }); */
        } else {
          setSession(null);
          setStoredSessionWeb(null);
        }
        setInitializing(false);
      });
      return () => unsub();
    }

    // If Firebase is not configured, stop initializing
    setInitializing(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { signInWithEmail } = await import('../services/auth');
      const cred = await signInWithEmail(email, password);
      const next: Session = { userId: cred.user.uid, email: cred.user.email ?? email };
      setSession(next);
      setStoredSessionWeb(next);
    } catch (e) {
      console.warn('Sign-in con Firebase fallo:', e);
      // Evitar rechazos no manejados; no avanzar
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { signUpWithEmail } = await import('../services/auth');
      const cred = await signUpWithEmail(email, password);
      const next: Session = { userId: cred.user.uid, email: cred.user.email ?? email };
      setSession(next);
      setStoredSessionWeb(next);
    } catch (e) {
      // Fallback: keep previous behavior if Firebase no está configurado
      const next: Session = { userId: 'demo-user', email };
      setSession(next);
      setStoredSessionWeb(next);
      console.warn('Sign-up con Firebase falló o no está configurado:', e);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { signOutFirebase } = await import('../services/auth');
      await signOutFirebase();
    } catch (e) {
      console.warn('Sign-out con Firebase falló o no está configurado:', e);
    } finally {
      setSession(null);
      setStoredSessionWeb(null);
    }
  }, []);

  const value = useMemo(
    () => ({ session, initializing, signIn, signUp, signOut }),
    [session, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}


