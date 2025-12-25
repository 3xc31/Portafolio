import { Injectable } from '@angular/core';
import { DocumentSnapshot, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getStorage, ref } from 'firebase/storage';
import { AlertsService } from './alerts.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsFirebaseService {

  constructor(private alert: AlertsService) { }

  /* --------------------- */
  /* FUNCIONES DE PRODUCTO */
  /* --------------------- */

  //Busca y devuelve todas los Productos
  async buscarProductos(): Promise<any[]> {
    const db = getFirestore();
    const productos: any[] = [];

    const querySnapshot = await getDocs(collection(db, "Producto"));
    querySnapshot.forEach((doc) => {
      productos.push({
        id: doc.id,
        name: doc.data()['name'],
        price: doc.data()['price'],
        foto: doc.data()['foto'],
        stock: doc.data()['stock'],
      });
    });

    return productos;
  }

  //Busca y devuelve todos los datos de un documento (Producto) según la ID
  async descripcionProducto(id: any): Promise<any> {
    const db = getFirestore();

    const docRef = doc(db, "Producto", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data(); // Devuelve los datos del producto
    } else {
      return null; // Devuelve null si el producto no existe
    }
  }

  async crearProducto(nombre: string, descripcion: string, precio: number, stock: number, req_minimo: string, req_recomendado: string, foto: string, categorias: any) {
    const db = getFirestore();
    // Crear un documento en la colección de Producto
    await addDoc(collection(db, 'Producto'), {
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

  async actualizarProducto(id: any, nombre: string, descripcion: string, precio: number, stock: number, req_minimo: string, req_recomendado: string, foto: string, categorias: any) {
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

  async actulizarStock(id: string, stockNuevo: number) {
    const db = getFirestore();
    const Producto = doc(db, "Producto", id);

    await updateDoc(Producto, {
      stock: stockNuevo
    });
  }

  async eliminarProducto(id: any, tokenImagen: any) {
    const db = getFirestore();
    const storage = getStorage();
    await deleteDoc(doc(db, "Producto", id));

    // Extrae la ruta de la imagen de la URL del token
    const rutaImagen = await this.extraerRutaImagen(tokenImagen);

    const desertRef = ref(storage, rutaImagen);
    deleteObject(desertRef)
  }

  /* ---------------------- */
  /* FUNCIONES DE CATEGORIA */
  /* ---------------------- */

  //Crea una nueva categoria
  async crearCategoria(nombre: string) {
    const db = getFirestore();
    await addDoc(collection(db, 'Categoria'), {
      Categoria: nombre,
    });
  }

  //Busca y devuelve todas las Categorias
  async buscarCategorias(): Promise<any[]> {
    const db = getFirestore();
    const categorias: any[] = [];

    const querySnapshot = await getDocs(collection(db, "Categoria"));
    querySnapshot.forEach((doc) => {
      categorias.push({ id: doc.id, ...doc.data() });
    });
    return categorias;
  }

  /* -------------------- */
  /* FUNCIONES DE STORAGE */
  /* -------------------- */

  async extraerRutaImagen(token: string): Promise<string> {
    // Divide la URL en partes
    const partes = token.split('o/', 3);

    // Extrae la ruta de la imagen de la segunda parte 
    const rutaImagen = partes[1].split('?')[0];

    // La ruta de la imagen está en la segunda parte
    return decodeURIComponent(rutaImagen)
  }

  /* -------------------- */
  /* FUNCIONES DE Carrito */
  /* -------------------- */

  //Crear Carrito
  async crearCarrito(uid: string) {
    const db = getFirestore();
    // Crear un documento en la colección de Carrito
    await setDoc(doc(db, 'Carrito', uid), {
      Carrito: true
    });
  }

  //Crear FastCarrito
  async crearFastCarrito(uid: string) {
    const db = getFirestore();
    // Crear un documento en la colección de Carrito
    await setDoc(doc(db, 'Carrito', uid), {
      Carrito: true
    });
  }

  async obtenerCarrito(uid: string): Promise<DocumentSnapshot<any>> {
    const db = getFirestore();
    const carritoRef = doc(db, 'Carrito', uid);
    return await getDoc(carritoRef);
  }

  //Eliminar Carrito
  async eliminarCarrito(id: string) {
    const db = getFirestore();
    await deleteDoc(doc(db, "Carrito", id));
  }

  //Agregar Producto al carrito
  async agregarProd(uid: any, prodId: string, nombre: string, cantidad: number, subtotal: number, foto: any, stock: number, price: number) {
    const db = getFirestore();
    const carritoRef = doc(db, 'Carrito', uid);

    // Obtener el documento del carrito
    const carritoSnapshot = await getDoc(carritoRef);

    if (carritoSnapshot.exists()) {
      // Obtener el arreglo de productos actual
      const productosActuales = carritoSnapshot.data()['Productos'] || [];

      // Buscar si el producto ya existe en el carrito
      const productoIndex = productosActuales.findIndex(
        (producto: { id: string; }) => producto.id === prodId
      );

      if (productoIndex !== -1) {
        // Si el producto existe, actualizar la cantidad y el subtotal
        const nuevaCantidad = productosActuales[productoIndex].cantidad + cantidad;

        // Verificar si la nueva cantidad no supera el stock
        if (nuevaCantidad <= stock) {
          productosActuales[productoIndex].cantidad = nuevaCantidad;
          productosActuales[productoIndex].subtotal += subtotal;

          // Actualizar el documento del carrito con el nuevo arreglo de productos
          await updateDoc(carritoRef, {
            Productos: productosActuales
          });
        } else {
          // Si la cantidad supera el stock, mostrar un mensaje de error
          this.alert.presentAlert('Error', 'Cantidad inválida', 'La cantidad solicitada supera el stock disponible.');
        }
      } else {
        // Si el producto no existe, agregarlo al carrito
        await updateDoc(carritoRef, {
          Productos: arrayUnion({
            id: prodId,
            nombre: nombre,
            foto: foto,
            cantidad: cantidad,
            subtotal: subtotal,
            price: price
          })
        });
      }
    } else {
      // Si el carrito no existe, crear un nuevo carrito con el producto
      await setDoc(carritoRef, {
        Productos: [
          {
            id: prodId,
            nombre: nombre,
            foto: foto,
            cantidad: cantidad,
            subtotal: subtotal
          }
        ]
      });
    }
  }

  //Agregar Producto al carrito
  async agregarFastProd(uid: any, prodId: string, nombre: string, cantidad: number, subtotal: number, foto: any, stock: number, price: number) {
    const db = getFirestore();
    const carritoRef = doc(db, 'FastCarrito', uid);

    // Si el carrito no existe, crear un nuevo carrito con el producto
    await setDoc(carritoRef, {
      Productos: [
        {
          id: prodId,
          nombre: nombre,
          foto: foto,
          cantidad: cantidad,
          subtotal: subtotal
        }
      ]
    });
  }

  //Devuelve todo los Productos del carrito
  async traerCarrito(uid: string) {
    const db = getFirestore();
    const carritoRef = doc(db, 'Carrito', uid);
    const carritoSnapshot = await getDoc(carritoRef);

    if (carritoSnapshot.exists()) {
      return carritoSnapshot.data();
    } else {
      return null;
    }
  }

  //Devuelve todo los Productos del carrito Rápido
  async traerFastCarrito(uid: string) {
    const db = getFirestore();
    const carritoRef = doc(db, 'FastCarrito', uid);
    const carritoSnapshot = await getDoc(carritoRef);

    if (carritoSnapshot.exists()) {
      return carritoSnapshot.data();
    } else {
      return null;
    }
  }

  //Elimina uno de los productos del carrito
  async eliminarProd(uid: string, prodId: string) {
    const db = getFirestore();
    const carritoRef = doc(db, 'Carrito', uid);

    // Obtener el índice del producto a eliminar
    const carritoSnapshot = await getDoc(carritoRef);
    const productos = carritoSnapshot.data()!['Productos'];
    const index = productos.findIndex((producto: { id: string; }) => producto.id === prodId);

    // Eliminar el elemento del array
    if (index !== -1) {
      await updateDoc(carritoRef, {
        Productos: arrayRemove(productos[index]) // Elimina el elemento por índice
      });
    }
  }

  async actualizarCantidad(uid: string, idProducto: string, nuevaCantidad: number) {
    try {
      const db = getFirestore();
      const carritoDocRef = doc(db, 'Carrito', uid); // Obtén la referencia al documento
      const carritoDoc = await getDoc(carritoDocRef);

      if (carritoDoc.exists()) {
        const carritoData = carritoDoc.data();
        const productoIndex = carritoData['Productos'].findIndex((item: { id: string; }) => item.id === idProducto);

        if (productoIndex !== -1) {
          // Actualiza la cantidad del producto
          carritoData['Productos'][productoIndex].cantidad = nuevaCantidad;
          carritoData['Productos'][productoIndex].subtotal = carritoData['Productos'][productoIndex].price * nuevaCantidad;

          // Actualiza el documento del carrito en Firestore
          await updateDoc(carritoDocRef, { // Pasa la referencia del documento
            Productos: carritoData['Productos']
          });
        } else {
          console.error('Producto no encontrado en el carrito.');
        }
      } else {
        console.error('Carrito no encontrado para el usuario.');
      }
    } catch (error) {
      console.error('Error al actualizar la cantidad del producto en el carrito:', error);
    }
  }

  async revisarStockCarrito(uid: string, prodId: string, nuevoStock: number) {
    const db = getFirestore();
    const carritoRef = doc(db, 'Carrito', uid);

    const carritoSnapshot = await getDoc(carritoRef);

    if (carritoSnapshot.exists()) {
      const productosActuales = carritoSnapshot.data()['Productos'] || [];

      const productoIndex = productosActuales.findIndex(
        (producto: { id: string; }) => producto.id === prodId
      );

      if (productoIndex !== -1) {
        const cantidadEnCarrito = productosActuales[productoIndex].cantidad;

        if (cantidadEnCarrito > nuevoStock) {
          // Si la cantidad en el carrito supera el nuevo stock, actualizar la cantidad en el carrito
          productosActuales[productoIndex].cantidad = nuevoStock;
          productosActuales[productoIndex].subtotal = nuevoStock * productosActuales[productoIndex].price; // Actualizar subtotal

          // Actualizar el documento del carrito
          await updateDoc(carritoRef, {
            Productos: productosActuales
          });

          // Mostrar mensaje de notificación al usuario
          this.alert.presentAlert('Atención', 'Stock actualizado', 'La cantidad de este producto en tu carrito se ha actualizado debido a un cambio en el stock.');
        }
      }
    }
  }

}
