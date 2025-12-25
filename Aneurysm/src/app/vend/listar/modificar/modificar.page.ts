import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsFirebaseService } from 'src/app/services/products-firebase.service';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { AlertsService } from 'src/app/services/alerts.service';

@Component({
  selector: 'app-modificar',
  templateUrl: './modificar.page.html',
  styleUrls: ['./modificar.page.scss'],
})
export class ModificarPage implements OnInit {

  name: string = "";
  price: number = 0;
  stock: number = 0;
  descripcion: string = "";
  req_minimo: string = "";
  req_recomendado: string = "";
  categoria: any[] = [
    {
      id: '',
      nombre: '',
    }
  ];

  catFoto: any = "";
  cate: any = [];

  modificarProdForm = this.formBuilder.group({
    name: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(60),
        Validators.pattern("^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ/*#'’-Ⓡ™]+$")
      ]
    }),
    price: new FormControl(0, {
      validators: [
        Validators.required,
        Validators.pattern("^[0-9]+$")
      ]
    }),
    stock: new FormControl(0, {
      validators: [
        Validators.required,
        Validators.pattern("^[0-9]+$")
      ]
    }),
    descripcion: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(1600),
        Validators.pattern("^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ/*#'’&,.:()+\n-Ⓡ™・]+$")
      ]
    }),
    req_minimo: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(1600),
        Validators.pattern("^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ/*#'’&,.:()+\n-Ⓡ™・]+$")
      ]
    }),
    req_recomendado: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(1600),
        Validators.pattern("^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ/*#'’&,.:()+\n-Ⓡ™・]+$")
      ]
    }),
    categoria: new FormControl('', {
      validators: [
        Validators.required
      ]
    }),
    img: new FormControl('', {
      validators: [
        Validators.required
      ]
    }),
  })

  isSubmitted = false;

  idRecibida: number = 0;

  arregloCategorias: any = [];
  categorias: any = [];
  categoriasFilter: any = [];

  categoriasSeleccionadas: number[] = [];
  nombreFoto: any = '';

  constructor(
    private formBuilder: FormBuilder,
    private activeRouter: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private prodFire: ProductsFirebaseService,
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
    this.init(this.idRecibida);
    this.prodFire.buscarCategorias().then(categorias => {
      this.cate = categorias;
    });
  }

  async init(id: number) {
    const producto = await this.prodFire.descripcionProducto(id);

    if (producto === null) {
      this.alert.presentAlert("Error", "Error en la base de datos", "Error al buscar el producto");
      return;
    }

    if (producto) {
      await this.modificarProdForm.patchValue({
        name: producto.name,
        price: producto.price,
        stock: producto.stock,
        descripcion: producto.descripcion,
        req_minimo: producto.req_minimo,
        req_recomendado: producto.req_recomendado,
        categoria: producto.categorias,
        img: producto.foto,
      });

      /* this.catFoto = producto.foto;
      const nombreF = this.prodFire.extraerRutaImagen(producto.foto);
      this.nombreFoto = nombreF;
      console.log(nombreF); */
    } else {
      console.error('Producto no encontrado.');
    }
  }

  openProfileFileDialog() {
    document.getElementById('cover-upload')?.click();
  }

  createObjectURL(file: File): string {
    return URL.createObjectURL(file);
  }

  handlerProfile(event: any) {
    const file = event.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (allowedTypes.includes(file.type)) {
      /* const imageUrl: string = await this.uploadImage(this.catFoto); */
      this.catFoto = file;
      let foto = this.createObjectURL(this.catFoto);
      this.modificarProdForm.get('img')?.setValue(foto);
    } else {
      this.alert.presentAlert("Formato Incorrecto", "Solo puedes elegir imagenes de formato: JPEG, PNG, or JPG", "");
      console.error('Invalid file type. Please select an image file (JPEG, PNG, or JPG).');
    }
  }

  uploadImage(file: File) {
    const storageRef = ref(getStorage(), `juegos/${file.name}`);

    return uploadBytes(storageRef, file).then((snapshot) => {
      // Obtener la URL de descarga de la imagen
      return getDownloadURL(storageRef);
    });
  }

  isChecked(value: any) {
    return this.categoriasSeleccionadas.includes(value);
  }

  async onSubmit() {
    this.isSubmitted = true;
    console.log(this.modificarProdForm.value)

    if (this.modificarProdForm.value.img === null) {
      this.modificarProdForm.controls['img'].setErrors({ 'required': true });
      return;
    }

    if (!this.modificarProdForm.valid) {
      console.log("not valid");
      return;
    }

    let id = this.idRecibida;
    let nombre = this.modificarProdForm.value.name;
    let descripcion = this.modificarProdForm.value.descripcion;
    let precio = this.modificarProdForm.value.price;
    let stock = this.modificarProdForm.value.stock;
    let req_minimo = this.modificarProdForm.value.req_minimo;
    let req_recomendado = this.modificarProdForm.value.req_recomendado;
    let image = this.modificarProdForm.value.img;
    let categorias = this.modificarProdForm.value.categoria;

    if (this.catFoto != '') {
      // Subir la imagen
      let image = await this.uploadImage(this.catFoto);
      
      await this.prodFire.actualizarProducto(id, nombre!, descripcion!, precio!, stock!, req_minimo!, req_recomendado!, image, categorias);
      this.alert.presentAlert("Juego actualizado", "", "Los campos del juego se han actualizado exitosamente");
      return;
    }

    await this.prodFire.actualizarProducto(id, nombre!, descripcion!, precio!, stock!, req_minimo!, req_recomendado!, image!, categorias);
    this.alert.presentAlert("Juego actualizado", "", "Los campos del juego se han actualizado exitosamente");
  }

  isOpen(state: boolean) {
    if (state === false) {
      this.router.navigate(['/tabs/tab4'])
    }
  }

  public validation_messages = {
    'name': [
      { type: 'required', message: 'El nombre es obligatorio' },
      { type: 'minlength', message: 'El nombre debe tener 10 o más caracteres' },
      { type: 'maxlength', message: 'El nombre debe tener 60 o menos caracteres' },
      { type: 'pattern', message: 'El nombre no debe tener caracteres especiales' },
    ],
    'price': [
      { type: 'required', message: 'El precio es obligatorio' },
      { type: 'pattern', message: 'El precio debe ser un número entero' },
    ],
    'stock': [
      { type: 'required', message: 'El stock disponible es obligatorio' },
      { type: 'pattern', message: 'El stock disponible debe ser un número entero' },
    ],
    'descripcion': [
      { type: 'required', message: 'La descripción es obligatoria' },
      { type: 'minlength', message: 'La descripción debe tener 10 o más caracteres' },
      { type: 'maxlength', message: 'La descripción debe tener 600 o menos caracteres' },
      { type: 'pattern', message: 'La descripción no debe tener caracteres especiales' },
    ],
    'req_minimo': [
      { type: 'required', message: 'Los requisitos minimos son obligatorios' },
      { type: 'minlength', message: 'Los requisitos minimos debe tener 10 o más caracteres' },
      { type: 'maxlength', message: 'Los requisitos minimos debe tener 600 o menos caracteres' },
      { type: 'pattern', message: 'Los requisitos minimos no debe tener caracteres especiales' },
    ],
    'req_recomendado': [
      { type: 'required', message: 'Los requisitos recomendados son obligatorios' },
      { type: 'minlength', message: 'Los requisitos recomendados debe tener 10 o más caracteres' },
      { type: 'maxlength', message: 'Los requisitos recomendados debe tener 600 o menos caracteres' },
      { type: 'pattern', message: 'Los requisitos recomendados no debe tener caracteres especiales' },
    ],
    'categoria': [
      { type: 'required', message: 'Ingresar al menos una categoria' }
    ],
    'img': [
      { type: 'required', message: 'La imagen es obligatoria' }
    ],
  }
}
