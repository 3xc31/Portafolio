import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { TransactionsService } from 'src/app/services/transactions.service';
import { environment } from 'src/environments/environment';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Importa el locale español (opcional)

@Component({
  selector: 'app-record',
  templateUrl: './record.page.html',
  styleUrls: ['./record.page.scss'],
})
export class RecordPage implements OnInit {

  isModalOpen = false;

  arregloCompra: any = [];
  arregloDetalle: any = [];

  compra: any = [];

  userID: any = '';
  fecha: any;

  constructor(
    private router: Router,
    private activeRouter: ActivatedRoute,
    private transServ: TransactionsService,
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.onInit();
  }

  async onInit() {
    const auth = getAuth();
    return new Promise<any>((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const uid = user.uid;
          this.arregloCompra = await this.transServ.buscarTransacciones(uid);
          this.arregloCompra.sort((a:any, b:any) => {
            // Compara las fechas de 'a' y 'b'
            return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); 
          });
        } else {
          reject("user not authenticated");
        }
      });
    });
  }

  async setOpen(isOpen: boolean, id: any) {

    const detalles = await this.transServ.getTransaccion(id);

    if (detalles !== null) {
      this.arregloDetalle = detalles['Productos'];
      this.compra = detalles
      
      this.fecha = this.compra.fecha.toDate();

    } else {
      return;
    }

    this.isModalOpen = isOpen;
  }

  setOpen1(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }
}
