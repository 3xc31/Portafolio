import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type UserCredential } from 'firebase/auth';
import { auth, isFirebaseConfigured, firestore } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase no está configurado. Revisa expo.extra.firebase en app.json.');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    if (firestore) {
      const uid = cred.user.uid;
      await setDoc(
        doc(firestore, 'users', uid),
        {
          email: cred.user.email ?? email,
          fullName: '',
          role: '',
          organization: '',
          bio: '',
          memberSince: new Date().toISOString(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (e) {
    console.warn('No se pudo crear el perfil en Firestore tras el registro', e);
  }
  return cred;
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase no está configurado. Revisa expo.extra.firebase en app.json.');
  }
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase(): Promise<void> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase no está configurado. Revisa expo.extra.firebase en app.json.');
  }
  await firebaseSignOut(auth);
}

