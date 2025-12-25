import { Injectable } from '@angular/core';
import firebase from 'firebase/compat/app';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Auth, getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  setUser(user: any) {
    this.userSubject.next(user);
  }

  constructor(public ngFireAuth: AngularFireAuth) { }

  async buscarUsuarioActual() {
    const auth = getAuth();
    return new Promise<any>((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const uid = user.uid;
          const db = getFirestore();
          const docRef = collection(db, 'Usuario');

          const q = query(docRef, where('uid', '==', uid));

          const imagesSnapshot = await getDocs(q);
          resolve(imagesSnapshot.docs[0].data());
        } else {
          reject("user not authenticated");
        }
      });
    });
  }

  async encontrarUsuario(correo: any) {
    try {
      await this.ngFireAuth.createUserWithEmailAndPassword(correo, 'temporal'); // Crea una cuenta temporal con la contraseña "temporal"
      // Si la cuenta se crea exitosamente, significa que el correo no está en uso

      const user = await this.ngFireAuth.currentUser; // Obtiene el usuario de la promesa
      if (user) {
        await user.delete(); // Elimina la cuenta temporal
        return true; // El correo está disponible
      } else {
        console.error('Error: User object is null');
        return false; // Error al obtener el usuario
      }
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  async registerUser(email: string, password: string) {
    try {
      return await this.ngFireAuth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
      if ((error as Error).message === 'auth/email-already-in-use') {
        console.error('Error: Email is already in use');
        throw new Error('Email is already in use');
      }
      console.error('Error registering user:', error);
      throw error; // Rethrow the error to be handled by the caller
    }
  }

  async createUsuarioDocument(user: firebase.User) {
    const db = getFirestore();
    // Crear un documento en la colección de Usuario
    await setDoc(doc(db, 'Usuario', user.uid), {
      Nombre: '', // Initialize with empty string, update later
      Apellido: '', // Initialize with empty string, update later
      Telefono: '',
      Rut: 0,
      DVRut: '',
      Foto: 'https://ionicframework.com/docs/img/demos/avatar.svg',
      Rol: 'Rol/bnb3Ua9WJz9CQKaukl4W',
    });

    await setDoc(doc(db, 'Carrito', user.uid), {
      Productos: [],
    });
  }

  async loginUser(email: string, password: string) {
    return await this.ngFireAuth.signInWithEmailAndPassword(email, password).then((userCredential) => {
      // Signed in
      var user = userCredential.user;
      console.log("Valid");
      // ...
    })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode, errorMessage)
        return errorCode;
      });;
  }

  async resetPassword(email: string) {
    return await this.ngFireAuth.sendPasswordResetEmail(email);
  }

  async singOut() {
    return await this.ngFireAuth.signOut();
  }

  async getProfile() {
    return await this.ngFireAuth.currentUser;
  }
}
