import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { ProductsFirebaseService } from 'src/app/services/products-firebase.service';
import { TransbankService } from 'src/app/services/trans-bank.service';
import { TransactionsService } from 'src/app/services/transactions.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-trans-completed',
  templateUrl: './trans-completed.page.html',
  styleUrls: ['./trans-completed.page.scss'],
})
export class TransCompletedPage implements OnInit {

  transaccionEstado: string | null = null;

  token: string = '';
  result: string = '';

  user: any;
  carrito: any;
  compra: any;

  productos: any = [];
  flag: any = '';
  type: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private transbankService: TransbankService,
    private authService: AuthenticationService,
    private transService: TransactionsService,
    private prodFire: ProductsFirebaseService,
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.init();
    /* const urlSearchParams = new URLSearchParams(window.location.search);
    this.flag = urlSearchParams.get('FLAG');  */
    this.route.queryParams.subscribe(params => {
      this.token = params['token_ws'];
      this.result = params['TBK_TOKEN'];
      this.flag = params['FLAG']

      console.log(this.flag)
      if (this.token) {
        console.log("Verificando Estado")
        this.verificarEstado();
      }
    });
  }

  async init() {
    this.user = await this.authService.buscarUsuarioActual();
  }

  async verificarEstado() {
    this.transbankService.confirmarTransaccion(this.token).subscribe(
      (response: any) => {
        console.log('Verificar confirmarTransaccion Response:', response);
        this.transaccionEstado = response.status; // Muestra el estado de la transacción

        if (this.transaccionEstado === 'AUTHORIZED') {
          this.guardarCompra();
          this.type = response.payment_type_code
        }

      },
      (error: any) => {
        console.error('Error in confirmarTransaccion:', error); // En caso de que la transacción sea erronea
        this.transaccionEstado = 'Error al verificar estado';
      }
    );

    this.transbankService.verificarEstado(this.token).subscribe(
      (response: any) => {
        console.log('Verificar verificarEstado Response:', response);
        this.transaccionEstado = response.status; // Muestra el estado de la transacción
      },
      (error: any) => {
        console.error('Error in verificarEstado:', error); // En caso de que la transacción sea erronea
        this.transaccionEstado = 'Error al verificar estado';
      }
    );
  }

  async guardarCompra() {
    const user = await this.authService.buscarUsuarioActual();
    let carrito: any = [];
    if (this.flag === 'SHOP') {
      carrito = await this.prodFire.traerCarrito(user.uid);
    } else if (this.flag === 'FAST') {
      carrito = await this.prodFire.traerFastCarrito(user.uid);
    } else {
      return;
    }

    if (carrito) {
      const fecha = new Date(); // Obtén la fecha actual
      const buyOrder = this.transService.generarIdOrdenCompra();
      // Calcula el total del carrito
      let total = 0;
      for (const producto of carrito['Productos']) {
        total += producto.subtotal;
      }

      // Crea la transacción
      await this.transService.crearTransaccion(
        user.uid,
        this.token, // Reemplaza con el ID de la transacción de Transbank
        total, // Total de la compra
        fecha,
        buyOrder,
        this.type,
        carrito['Productos'] // Array de productos
      );

      await this.accionesPosteriores(carrito)
    }
  }

  async accionesPosteriores(carrito: any) {
    //Actualizar Stock
    this.productos = carrito['Productos']
    if (this.productos) {
      for (let producto of this.productos) {
        const id = producto.id
        const cantidad = producto.cantidad
        console.log(id)
        console.log(cantidad)
        const productoDB = await this.prodFire.descripcionProducto(id); // Obtener datos del producto de la base de datos

        if (productoDB) {
          const nuevoStock = productoDB.stock - cantidad; // Calcular el nuevo stock
          await this.prodFire.actulizarStock(id, nuevoStock); // Actualizar el stock en la base de datos
        }
      }

      //Eliminar carrito anteior y crear uno nuevo vacio
      if (this.flag === 'SHOP') {
        const user = await this.authService.buscarUsuarioActual();
        await this.prodFire.eliminarCarrito(user.uid);
        await this.prodFire.crearCarrito(user.uid);
      }
    } else {
      // Manejar el caso en que el carrito no existe o no tiene productos
      console.error('Carrito no encontrado o vacío');
    }
  }

  goHome() {
    this.router.navigate(['']);
  }
}
