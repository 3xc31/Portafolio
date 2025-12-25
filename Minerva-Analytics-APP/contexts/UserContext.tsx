import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';

import { firestore, isFirebaseConfigured, auth } from '../services/firebase';
import { useAuth } from './AuthContext';

type UserStat = {
  label: string;
  value: string;
};

export type UserProfile = {
  fullName: string;
  email: string;
  role: string;
  organization: string;
  memberSince: string;
  bio: string;
};

type UserProfileState = UserProfile & {
  initials: string;
};

type UserContextValue = {
  profile: UserProfileState;
  stats: UserStat[];
  updateProfile: (changes: Partial<UserProfile>) => Promise<void>;
};

const defaultStats: UserStat[] = [
  { label: 'Watchlists', value: '0' },
  { label: 'Favoritas', value: '0' },
  { label: 'Simulaciones', value: '0' },
];

const UserContext = createContext<UserContextValue | undefined>(undefined);

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

// Document ID now uses Firebase Auth UID instead of email

function placeholderProfile(email: string): UserProfileState {
  return {
    fullName: '',
    email,
    role: '',
    organization: '',
    memberSince: '',
    bio: '',
    initials: '',
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfileState>({
    fullName: '',
    email: '',
    role: '',
    organization: '',
    memberSince: '',
    bio: '',
    initials: '',
  });
  const { session } = useAuth();
  const [simulationsCount, setSimulationsCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);

  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) return;
    if (!session?.userId) return; // evita lecturas sin auth

    const docRef = doc(firestore, 'users', session.userId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<UserProfile>;
          setProfile((prev) => {
            const nextFullName = data.fullName ?? prev.fullName;
            return {
              ...prev,
              ...data,
              initials: getInitials(nextFullName),
            };
          });
        }
      },
      (error) => {
        console.warn('No se pudo escuchar el perfil en Firebase', error);
      },
    );

    return () => unsubscribe();
  }, [session?.userId]);

  // Eliminado el doble fetch; la carga principal depende del UID

  // Sync profile email with authenticated session (preserve existing data)
  useEffect(() => {
    if (!session?.email) return;
    setProfile((prev) => {
      if (prev.email === session.email) return prev;
      return {
        ...prev,
        email: session.email!,
        // keep fullName and recompute initials from it
        initials: getInitials(prev.fullName),
      };
    });
  }, [session?.email]);

  const updateProfile = useCallback(async (changes: Partial<UserProfile>) => {
    setProfile((prev) => {
      const nextFullName = changes.fullName ?? prev.fullName;
      const nextProfile: UserProfileState = {
        ...prev,
        ...changes,
        initials: getInitials(nextFullName),
      };

      // Save to Firebase using UID (session or currentUser) as document ID
      const uid = session?.userId || auth?.currentUser?.uid;
      if (firestore && isFirebaseConfigured && uid) {
        const docRef = doc(firestore, 'users', uid);
        setDoc(
          docRef,
          {
            fullName: nextProfile.fullName,
            email: nextProfile.email,
            role: nextProfile.role,
            organization: nextProfile.organization,
            bio: nextProfile.bio,
            memberSince: nextProfile.memberSince,
          },
          { merge: true },
        ).catch((error) => {
          console.warn('No se pudo guardar el perfil en Firebase', error);
        });
      }

      return nextProfile;
    });
  }, [session?.userId, isFirebaseConfigured, firestore]);

  // Real-time simulations count for current user
  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) {
      setSimulationsCount(0);
      return;
    }
    const uid = session?.userId || auth?.currentUser?.uid;
    if (!uid) {
      setSimulationsCount(0);
      return;
    }
    const q = query(
      collection(firestore, 'real_state_simulations'),
      where('user.uid', '==', uid),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSimulationsCount(snapshot.size ?? 0);
      },
      (error) => {
        console.warn('No se pudo escuchar cambios de simulaciones', error);
        setSimulationsCount(0);
      },
    );
    return () => unsubscribe();
  }, [session?.userId, isFirebaseConfigured, firestore]);

  // Real-time favorites count (Favoritos/<uid>.symbols length)
  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) {
      setFavoritesCount(0);
      return;
    }
    const uid = session?.userId || auth?.currentUser?.uid;
    if (!uid) {
      setFavoritesCount(0);
      return;
    }
    const favDocRef = doc(firestore, 'Favoritos', uid);
    const unsubscribe = onSnapshot(
      favDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setFavoritesCount(0);
          return;
        }
        try {
          const data = snapshot.data() as { symbols?: unknown } | undefined;
          const arr = Array.isArray(data?.symbols) ? (data!.symbols as unknown[]) : [];
          setFavoritesCount(arr.length);
        } catch {
          setFavoritesCount(0);
        }
      },
      (error) => {
        console.warn('No se pudo escuchar Favoritos', error);
        setFavoritesCount(0);
      },
    );
    return () => unsubscribe();
  }, [session?.userId]);

  const stats = useMemo(() => {
    const base = defaultStats.map((s) => ({ ...s }));
    const simIdx = base.findIndex((s) => s.label === 'Simulaciones');
    const simVal = String(simulationsCount ?? 0);
    if (simIdx >= 0) base[simIdx].value = simVal; else base.push({ label: 'Simulaciones', value: simVal });

    const favIdx = base.findIndex((s) => s.label === 'Favoritas');
    const favVal = String(favoritesCount ?? 0);
    if (favIdx >= 0) base[favIdx].value = favVal; else base.push({ label: 'Favoritas', value: favVal });
    return base;
  }, [simulationsCount, favoritesCount]);

  const value = useMemo(
    () => ({
      profile,
      stats,
      updateProfile,
    }),
    [profile, stats, updateProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
