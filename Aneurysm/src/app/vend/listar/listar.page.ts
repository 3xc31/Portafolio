import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonModal, ModalController } from '@ionic/angular';
import { initializeApp } from 'firebase/app';
import { ProductsFirebaseService } from 'src/app/services/products-firebase.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-listar',
  templateUrl: './listar.page.html',
  styleUrls: ['./listar.page.scss'],
})
export class ListarPage implements OnInit {
  presentingElement: any = undefined;

  isModalOpen = false;

  Productos: any = [];
  id: number = 0;
  producto: any = {};

  isSubmitted = false;

  isAlertOpen = false;
  public alertButtons = ['OK'];

  arregloProductos: any = [];

  alertFlag: boolean = false;


  constructor(
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private prodFire: ProductsFirebaseService,
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.traerProductos();
  }

  async traerProductos() {
    try {
      this.arregloProductos = await this.prodFire.buscarProductos();
    } catch (error) {
      console.error("Error al obtener productos:", error);
    }
  }

  /*  getProducto(id: number) {
     return this.http.get("assets/datos_internos/productos.json")
       .pipe(
         map((res: any) => {
           const productos = res.data;
           const productoEncontrado = productos.find((producto: any) => producto.id === id);
           return productoEncontrado;
         })
       );
   } */

  async presentAlert(id: any) {
    const alert = await this.alertController.create({
      header: '¿Estás seguro?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Alert canceled');
          },
        },
        {
          text: 'Sí',
          handler: () => {
            console.log('Alert confirmed');
            this.alertFlag = true;
            this.eliminar(id);
          },
        },
      ],
    });

    await alert.present();
  }

  eliminar(producto: any) {
    if (this.alertFlag) {
      this.prodFire.eliminarProducto(producto.id, producto.foto);
      this.alertFlag = false;
      this.traerProductos();
    }
  }

  modificar(productoId: number) {
    const idEncontrada = productoId;
    let navigationExtras: NavigationExtras = {
      state: {
        id: idEncontrada
      }
    }
    console.log(idEncontrada)
    this.router.navigate(['/listar/modificar'], navigationExtras)
  }

}
