import { Component, OnInit } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from "@angular/common/http";
import { map, switchMap } from "rxjs/operators";
import { AlertController } from '@ionic/angular';
import { ProductsFirebaseService } from 'src/app/services/products-firebase.service';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { ContentObserver } from '@angular/cdk/observers';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { TransbankService } from 'src/app/services/trans-bank.service';
import { TransactionsService } from 'src/app/services/transactions.service';
import { AlertsService } from 'src/app/services/alerts.service';

@Component({
  selector: 'app-tab1view',
  templateUrl: './tab1view.page.html',
  styleUrls: ['./tab1view.page.scss'],
})
export class Tab1viewPage implements OnInit {

  idRecibida: any = '';
  producto: any = [];
  categorias: any = [];
  categoriasFilter: any = [];

  isAlertOpen = false;

  public alertButtons = [
    {
      text: 'Ok',
    }
  ]

  public alertInputs = [
  ];

  userID: any = '';

  constructor(
    private router: Router,
    private activeRouter: ActivatedRoute,
    private http: HttpClient,
    private alertController: AlertController,
    private prodFire: ProductsFirebaseService,
    private authService: AuthenticationService,
    private transService: TransactionsService,
    private alert: AlertsService
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.activeRouter.queryParams.subscribe(param => {
      if (this.router.getCurrentNavigation()?.extras.state) {
        this.idRecibida = this.router.getCurrentNavigation()?.extras?.state?.['id'];
      }
    })
  }

  ngOnInit() {
    this.getProducto();
  }

  ionViewWillEnter() {
    this.getProducto();
  }

  async getProducto() {
    const producto: any = {} = await this.prodFire.descripcionProducto(this.idRecibida);
    this.producto = producto;
    this.categorias = producto.categorias;
  }

  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
  }

  async comprar() {
    const usuario = await this.authService.buscarUsuarioActual();
    if (usuario !== null && usuario.nombre !== '') {
      const alert = await this.alertController.create({
        header: '¿Cuantos productos quieres comprar?',
        inputs: [
          {
            label: 'Cantidad',
            name: 'cantidad',
            type: 'number',
            placeholder: 'Cantidad',
          },
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
          },
          {
            text: 'OK',
            handler: async (data) => {
              const cantidad = parseInt(data.cantidad);

              if (!isNaN(cantidad) && cantidad >= 1 && cantidad <= this.producto.stock) {

                const total = this.producto.price * cantidad;
                await this.agregarFastCar(cantidad);
                this.transService.iniciarTransaccion(total, usuario.uid, 'FAST');
              } else {
                this.alert.presentAlert('Error', '', 'Ingresa una cantidad válida dentro de los límites.');
              }
            },
          },
        ],
      });

      await alert.present();
    } else {
      this.alert.presentAlert('Error', '', 'Debes iniciar sesión para poder comprar');
    }
  }

  async agregar() {
    try {
      const user = await this.authService.buscarUsuarioActual();
      if (user) {
        const alert = await this.alertController.create({
          header: '¿Cuantos deseas agregar?',
          inputs: [
            {
              label: 'Cantidad',
              name: 'cantidad',
              type: 'number',
              placeholder: 'Cantidad',
              value: 1
            },
          ],
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Confirmar',
              handler: async (data) => {
                const cantidad = parseInt(data.cantidad);

                if (!isNaN(cantidad) && cantidad >= 1 && cantidad <= this.producto.stock) {
                  await this.agregarCar(cantidad);
                  this.router.navigate(['/tabs/tab3'])
                } else {
                  this.alert.presentAlert('Error', '', 'Ingresa una cantidad válida dentro de los límites.');
                }
              },
            },
          ],
        });

        await alert.present();
      } else {
        this.alert.presentAlert('Error', '', 'Debes iniciar sesión para poder agregar al carrito');
      }
    } catch {
      this.alert.presentAlert('Error', '', 'Debes iniciar sesión para poder agregar al carrito');
    }
  }

  async agregarCar(cant: number) {
    const user = await this.authService.buscarUsuarioActual();

    let nombre = this.producto.name;
    let price = this.producto.price;
    let subtotal = price * cant;
    let id = this.idRecibida;
    let foto = this.producto.foto;
    let stock = this.producto.stock;

    await this.prodFire.agregarProd(user.uid, id, nombre, cant, subtotal, foto, stock, price);
  }

  async agregarFastCar(cant: number) {
    const user = await this.authService.buscarUsuarioActual();

    let nombre = this.producto.name;
    let price = this.producto.price;
    let subtotal = price * cant;
    let id = this.idRecibida;
    let foto = this.producto.foto;
    let stock = this.producto.stock;

    await this.prodFire.agregarFastProd(user.uid, id, nombre, cant, subtotal, foto, stock, price);
  }

}
