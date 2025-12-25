import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { IonInput } from '@ionic/angular';
import { AuthenticationService } from '../services/authentication.service';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { ProductsFirebaseService } from '../services/products-firebase.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {
  isAuthenticated = false;
  user: any;

  cate: any = [];

  images: any = '';

  isModalOpen: boolean = false;
  inputModel = '';

  nombreR: string = "";
  usuario: any = [];

  userData: any;


  isAlertOpenLogin = false;
  public alertButtons1 = ['OK'];

  handleRefresh(event: any) {
    setTimeout(() => {
      this.getData();
      event.target.complete();
    }, 2000);
  }

  userSubscription: any;

  @ViewChild('ionInputEl', { static: true }) ionInputEl!: IonInput;

  arregloCat: any[] = [
    {
      id: '',
      nombre: '',
    }
  ]

  categoria: string = "";

  categoriaForm = this.formBuilder.group({
    categoria: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern("^[A-Za-z ]+$")
      ]
    })
  })

  isSubmitted = false;
  submitError = "";

  isAlertOpen = false;
  public alertButtons = ['OK'];

  userID: any = '';
  id: any = '';
  rol: any = '';

  constructor(private router: Router,
    private formBuilder: FormBuilder,
    private activeRouter: ActivatedRoute,
    public authService: AuthenticationService,
    private prodFire: ProductsFirebaseService,
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.images = 'https://ionicframework.com/docs/img/demos/avatar.svg';
    this.isAuthenticated = false;
  }


  ngOnInit() {
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        this.images = user.Foto;
        this.isAuthenticated = true;
        this.getData();
      } else {
        this.images = 'https://ionicframework.com/docs/img/demos/avatar.svg';
        this.isAuthenticated = false;
      }
    });
    this.getData();
  }

  /*   ngOnDestroy() {
      this.userSubscription.unsubscribe();
    } */

  //Conseguir info del usuario si está autenticado
  async getData() {
    try {
      const user = await this.authService.buscarUsuarioActual();
      this.images = user['Foto'];

      this.isAuthenticated = true;

      const rolUsuarioDocRef = user['Rol'];

      const db = getFirestore();
      const rolDocRef = doc(db, 'Rol', rolUsuarioDocRef.id); //Crea un DocumentReference al documento 'Rol'
      const rolDoc = await getDoc(rolDocRef); //Consigue el documento referenciado

      if (rolDoc.exists()) {
        const rolData = rolDoc.data()['IdRol'];
        this.rol = rolData;
      } else {
        console.log("Role document does not exist");
      }
    } catch (error) {
      this.images = 'https://ionicframework.com/docs/img/demos/avatar.svg';
      this.isAuthenticated = false;
    }
  }

  //Establecia la id de usuario y el rol dentro de la localStorage
  /*   async init1() {
      let usID = localStorage.getItem('usuario')
      this.userID = usID;
      let userRol = localStorage.getItem('rol')
      this.rol = userRol;
    } */

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    this.prodFire.buscarCategorias().then(categorias => {
      this.cate = categorias;
    });

    if (!isOpen) {
      this.isAlertOpen = false;
      this.categoriaForm.controls['categoria'].setValue('');
    }
  }

  async logout() {
    this.isAlertOpenLogin = true;
    this.isAuthenticated = false;
    this.authService.singOut();
    this.getData();
  }

  /* async getUser() {
    let usID = localStorage.getItem('usuario')
    this.alert.presentAlert("Error", "Error en la base de datos", "id de usuario: " + this.userID + " o " + this.rol);
  } */

  //Envia la ID del usuario para conseguir su historial de compras
  /* irHistorial() {
    let navigationExtras: NavigationExtras = {
      state: {
        userID: this.userID
      }
    }

    this.router.navigate(['/tabs/tab3'], navigationExtras)
  } */

  async onSubmit() {
    this.isSubmitted = true;

    if (!this.categoriaForm.valid) {
      console.log("not valid");
      return;
    }

    console.log("valid")
    this.isAlertOpen = true;

    let cat = this.categoriaForm.value.categoria;
    this.prodFire.crearCategoria(cat!);
  }

  public validation_messages = {
    'categoria': [
      { type: 'required', message: 'La categoria es obligatoria' },
      { type: 'minlength', message: 'Debe tener minimo 3 letras' },
      { type: 'pattern', message: 'La categoria no debe tener números ni caracteres especiales' }
    ]
  }
}
