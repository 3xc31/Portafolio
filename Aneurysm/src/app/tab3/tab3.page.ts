import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TransbankService } from '../services/trans-bank.service';
import { AuthenticationService } from '../services/authentication.service';
import { ProductsFirebaseService } from '../services/products-firebase.service';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { doc, getFirestore } from 'firebase/firestore';
import { TransactionsService } from '../services/transactions.service';
import { AlertsService } from '../services/alerts.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {

  transaccionEstado: string | null = null;
  token: string = '01abc254c5a8d19f82408fcc9e11c238d222476007a434b7707485b9f8be7708';

  arregloDetalleProducto: any = [];

  isAlertOpen = false;
  public alertButtons = ['OK'];

  userID: any = '';
  total: number = 0;

  constructor(
    private alertController: AlertController,
    private authService: AuthenticationService,
    private prodFire: ProductsFirebaseService,
    private transService: TransactionsService,
    private alert: AlertsService
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.cargarCarrito();
  }

  ionViewWillEnter() {
    this.revisarStockCarrito();
  }

  async revisarStockCarrito() {
    try {
      const user = await this.authService.buscarUsuarioActual();
      if (user) {
        const carritoSnapshot = await this.prodFire.obtenerCarrito(user.uid);

        if (carritoSnapshot.exists()) { // Comprueba si el documento existe
          const productosActuales = carritoSnapshot.data().Productos || [];

          for (const producto of productosActuales) {
            const nuevoStock = await this.obtenerStockActual(producto.id);

            if (producto.cantidad > nuevoStock) {
              producto.cantidad = nuevoStock;
              producto.subtotal = nuevoStock * producto.price;
              await this.prodFire.actualizarCantidad(user.uid, producto.id, nuevoStock);
              this.alert.presentAlert('Atención', 'Stock actualizado', 'La cantidad de este producto en tu carrito se ha actualizado debido a un cambio en el stock.');
            }
          }
        }
        this.cargarCarrito();
      }
    } catch (error) {
      console.error('Error al revisar el stock en el carrito:', error);
    }
  }

  // Función para obtener el stock actual del producto
  async obtenerStockActual(prodId: string): Promise<number> {

    const productoDoc: any = {} = await this.prodFire.descripcionProducto(prodId);
    if (productoDoc) {
      return productoDoc.stock;
    } else {
      return 0; // O un valor por defecto si no se encuentra el producto
    }
  }

  async cargarCarrito() {
    try {
      const user = await this.authService.buscarUsuarioActual();
      if (user) {
        const carritoData = await this.prodFire.traerCarrito(user.uid);
        if (carritoData) {
          this.arregloDetalleProducto = carritoData['Productos']; // Asignar los productos del carrito
        } else {
          this.arregloDetalleProducto = []; // No hay productos en el carrito
        }
      } else {
        this.alert.presentAlert("Error", "", "Debes iniciar sesión para acceder al carrito.");
      }
    } catch (error) {
      if (error === 'user not authenticated') {
        return;
      } else {
        console.error('Error al obtener el carrito:', error);
        this.alert.presentAlert("Error", "", "Error al obtener el carrito.");
      }
    }
  }

  async comprar() {
    const user = await this.authService.buscarUsuarioActual();
    this.total = 0;
    if (user) {
      for (let producto of this.arregloDetalleProducto) {
        this.total += producto.subtotal;
      }

      // Formato de peso chileno
      const formatter = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0, // Para mostrar 0 decimales
      });

      const totalFormateado = formatter.format(this.total);

      const alert = await this.alertController.create({
        header: 'El total a pagar es ' + totalFormateado,
        subHeader: '¿Está seguro de que quiere realizar la compra?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
          },
          {
            text: 'Sí',
            handler: () => {

              this.transService.iniciarTransaccion(this.total, user.uid, 'SHOP');
              /*  this.setOpen(true); */
            },
          },
        ],
      });

      await alert.present();
    } else {
      this.alert.presentAlert('Error', '', 'Debes iniciar sesión para poder comprar');
    }
  }

  async borrar(id: any) {
    const alert2 = await this.alertController.create({
      header: '¿Está seguro?',
      subHeader: '¿Quiere eliminar este pedido del carrito?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Sí',
          handler: () => {
            this.borrarDetalle(id);
          },
        },
      ],
    });

    await alert2.present();
  }

  async borrarDetalle(id: any) {
    const user = await this.authService.buscarUsuarioActual();
    await this.prodFire.eliminarProd(user.uid, id);
    this.alert.presentAlert('Producto Quitado', '', 'El producto se ha quitado del carrito correctamente');
    this.cargarCarrito();
  }

  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
  }
}
