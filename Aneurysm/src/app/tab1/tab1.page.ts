import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";
import Swiper from 'swiper';
import { ProductsFirebaseService } from '../services/products-firebase.service';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { AlertsService } from '../services/alerts.service';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page implements OnInit {

  handleRefresh(event: any) {
    setTimeout(() => {
      this.traerProductos();
      event.target.complete();
    }, 2000);
  }

  cate: any = [];

  juegos: string = "";
  arregloProductos: any = [];
  ProductosFilter: any = [];
  id: number = 0;

  arregloProducto: any[] = [
    {
      id: '',
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      req_minimo: '',
      req_recomendado: '',
      foto: '',
    }
  ]

  @ViewChild(' swiper')
  swiperRef: ElementRef | undefined;
  swiper?: Swiper;


  constructor(
    private router: Router,
    private http: HttpClient,
    private prodFire: ProductsFirebaseService,
    private alert: AlertsService
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);

  }

  ngOnInit() {
    this.traerProductos();
  }

  async traerProductos() {
    try {
      this.arregloProductos = await this.prodFire.buscarProductos();
      // console.log("Productos:", this.arregloProductos); //Log para revisar los objetos recibidos
    } catch (error) {
      console.error("Error al obtener productos:", error);
    }
  }

  swiperSlideChanged(e: any) {
    console.log('changed', e);
  }

  swiperReady() {
    this.swiper = this.swiperRef?.nativeElement.swiper;
  }

  goNext() {
    this.swiper?.slideNext();
  }

  goPrev() {
    this.swiper?.slidePrev();
  }

  getId(productoId: number) {
    for (const producto of this.arregloProductos) {
      if (producto.id === productoId) {
        return productoId;
      }
    }
    return null; // Manejo para cuando no se encuentra la ID
  }

  getItem() {
    const objectKey = 'name';

    this.ProductosFilter = [];

    for (const producto of this.arregloProductos) {

      if (producto[objectKey].toLowerCase().includes(this.juegos.toLowerCase())) {
        this.ProductosFilter.push(producto);
      }

      if (this.juegos === "") {
        this.ProductosFilter = [];
      }
    }
  }

  showProducto(productoId: number) {

    let navigationExtras: NavigationExtras = {
      state: {
        id: productoId
      }
    }
    this.router.navigate(['/tabs/tab1/tab1view'], navigationExtras)
  }
}
