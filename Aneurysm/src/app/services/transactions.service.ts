import { Injectable } from '@angular/core';
import { DocumentSnapshot, addDoc, arrayUnion, collection, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { TransbankService } from './trans-bank.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  constructor(private transbankService: TransbankService) { }

  //Busca y devuelve todas las Transacciones de un usuario
  async buscarTransacciones(uid: string): Promise<any[]> {
    const db = getFirestore();
    const q = query(collection(db, "Compras"), where("uid", "==", uid));

    const querySnapshot = await getDocs(q);
    const transacciones: any = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      data['fecha'] = data['fecha'].toDate(); // Convierte la fecha a Date
      transacciones.push({
        id: doc.id,
        ...data // Agrega todos los campos de la transacción
      });5
    });

    return transacciones;
  }

  iniciarTransaccion(monto: number, uid: string, tipo: string) {
    let order = this.generarIdOrdenCompra();
    const sessionId = uid;
    const buyOrder = order;
    const returnUrl = 'http://localhost:8100/trans-completed?FLAG=' + tipo;
    console.log(uid);

    this.transbankService.iniciarTransaccion(monto, sessionId, buyOrder, returnUrl).subscribe(
      async (response: any) => {
        console.log('Response from server:', response);
        // Redirige al usuario a la URL de pago proporcionada por Transbank
        if (response.url && response.token) {
          window.location.href = response.url + '?token_ws=' + response.token ;
        }
      },
      (error: any) => {
        console.error('Error in iniciarTransaccion:', error);
      }
    );
  }

  //Busca y devuelve todos los datos de un documento (Compras) según la ID
  async getTransaccion(id: any): Promise<any> {
    const db = getFirestore();

    const docRef = doc(db, "Compras", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data(); // Devuelve los datos de la compra
    } else {
      return null; // Devuelve null si no existe
    }
  }

  async getTransaccionNoFinalizada(uid: string): Promise<any> {
    const db = getFirestore();
    return new Promise<any>(async (resolve, reject) => {
      const docRef = collection(db, 'Compras');

      const q = query(docRef, (where('uid', '==', uid), where('finalizada', '==', false)));

      const snapshot = await getDocs(q);
      resolve(snapshot.docs[0]);
    })
  }

  async iniciarDocTransaccion(uid: string, token: string) {
    const db = getFirestore();

    await setDoc(doc(db, 'Compras', token), {
      uid: uid,
      finalizada: false,
    });
  }

  async crearTransaccion(uid: string, tId: any, precio: number, fecha: Date, buyOrder: any, type: string, producto: any[]) {
    const db = getFirestore();
    const docRef = collection(db, 'Compras');
    const q = query(docRef, (where('transactionId', '==', tId)));

    const snapshot = await getDocs(q);

    if (!snapshot.docs[0]) {
      // Crear un documento en la colección de Compras
      await addDoc(collection(db, 'Compras'), {
        uid: uid,
        transactionId: tId,
        precio: precio,
        fecha: fecha,
        buyOrder: buyOrder,
        type: type,
        Productos: producto,
      });
    } else {
      console.log("Ya existe una compra para esa transacción")
    }
  }

  async actualizarTransaccion(id: any, nombre: string, descripcion: string, precio: number, stock: number, req_minimo: string, req_recomendado: string, foto: string, categorias: any) {
    const db = getFirestore();
    // Actaualiza un documento en la colección de Producto usando su id
    await setDoc(doc(db, 'Producto', id), {
      name: nombre,
      price: precio,
      descripcion: descripcion,
      stock: stock,
      req_minimo: req_minimo,
      req_recomendado: req_recomendado,
      foto: foto,
      categorias: categorias,
    });
  }

  generarIdOrdenCompra() {
    let longitudMaxima = 26
    const caracteresPermitidos = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let idOrdenCompra = "";

    // Genera un ID aleatorio con longitud máxima
    while (idOrdenCompra.length < longitudMaxima) {
      const indiceAleatorio = Math.floor(Math.random() * caracteresPermitidos.length);
      idOrdenCompra += caracteresPermitidos.charAt(indiceAleatorio);
    }

    return idOrdenCompra;
  }

}


