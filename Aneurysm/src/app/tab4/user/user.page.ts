import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { Camera, CameraResultType } from '@capacitor/camera';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, or, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { AlertsService } from 'src/app/services/alerts.service';

//Actualmente no se cuenta con la API en uso, por lo que, para evitar complicaciones
//Se comentó los segmentos del codigo que usan geocoding o maps

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {

  catFoto: any = ""

  name: string = "";
  surname: string = "";
  tfn: number = 0;
  rut: number = 0;
  dvrut: string = "";
  str: string = "";
  number: number = 0;
  region: string = "";
  comun: string = "";
  cod: number = 0;

  letra: string = "";

  isSubmitted = false;

  usuario: any = [];

  public uploadFileName: string = "";
  public uploadFileContent: string = "";

  userForm = this.formBuilder.group({
    name: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern("^[A-Za-zÀ-ÿ]+$")
      ]
    }),
    surname: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern("^[A-Za-zÀ-ÿ]+$")
      ]
    }),
    tfn: new FormControl(0, {
      validators: [
        Validators.required,
        Validators.maxLength(9),
      ]
    }),
    rut: new FormControl(0, {
      validators: [
        Validators.required,
        Validators.maxLength(8),
      ]
    }),
    dvrut: new FormControl('', {
      validators: [
        Validators.required,
        Validators.pattern("^[0-9kK]+$")
      ]
    }),
    /*     str: new FormControl('', {
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern("^[A-Za-z ]+$")
          ]
        }),
        number: new FormControl(0, {
          validators: [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(4),
          ]
        }),
        region: new FormControl('', {
          validators: [
            Validators.required
          ]
        }),
        comun: new FormControl('', {
          validators: [
            Validators.required
          ]
        }),
        cod: new FormControl(0, {
          validators: [
            Validators.required,
            Validators.maxLength(7),
            Validators.pattern("^[0-9]+$")
          ]
        }), */
  })

  calleRec: any = null;
  numeroRec: any;
  codpostalRec: any;
  regionRec: any;
  comunaRec: any;

  constructor(private router: Router,
    private formBuilder: FormBuilder,
    private activeRouter: ActivatedRoute,
    private authService: AuthenticationService,
    private alert: AlertsService
  ) {

  }

  ngOnInit() {
    this.init();
  }



  /*   ionViewWillEnter() {
      this.activeRouter.queryParams.subscribe(param => {
        if (this.router.getCurrentNavigation()?.extras.state) {
          this.calleRec = this.router.getCurrentNavigation()?.extras?.state?.['calle'];
          this.numeroRec = this.router.getCurrentNavigation()?.extras?.state?.['numero'];
          this.codpostalRec = this.router.getCurrentNavigation()?.extras?.state?.['cod_postal'];
          console.log(this.router.getCurrentNavigation()?.extras?.state?.['cod_postal'])
          this.regionRec = this.router.getCurrentNavigation()?.extras?.state?.['region'];
          this.comunaRec = this.router.getCurrentNavigation()?.extras?.state?.['comuna'];
        }
      });
  
      console.log(this.calleRec, this.numeroRec, this.codpostalRec, this.regionRec, this.comunaRec)
  
      if (this.calleRec !== null) {
        console.log("pasa direccion");
        this.userForm.patchValue({
          str: this.calleRec,
          number: this.numeroRec,
          region: this.regionRec,
          comun: this.comunaRec,
          cod: this.codpostalRec,
        })
      }
    } */

  async init() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const db = getFirestore();
        const uid = user.uid;
        const docRef = collection(db, 'Usuario');

        const q = query(docRef, where('uid', '==', uid));

        const docSnapshot = await getDocs(q);

        const usuarioDocs = docSnapshot.docs;
        const usuario = usuarioDocs[0].data();

        this.catFoto = usuario['Foto'];

        this.userForm.patchValue({
          name: usuario['Nombre'],
          surname: usuario['Apellido'],
          tfn: usuario['Telefono'],
          rut: usuario['Rut'],
          dvrut: usuario['DVRut'],
        });

      } else {
        //El usuario no está autenticado
        console.log("No Valido");
      }
    });
  }

  openProfileFileDialog() {
    document.getElementById('profile-upload')?.click();
  }

  handlerProfile(event: any) {
    const file = event.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (allowedTypes.includes(file.type)) {
      this.catFoto = file;
      this.profileImage();
    } else {
      this.alert.presentAlert("Formato Incorrecto", "Solo puedes elegir imagenes de formato: JPEG, PNG, or JPG", "");
      console.error('Invalid file type. Please select an image file (JPEG, PNG, or JPG).');
    }
  }

  profileImage() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const data = await this.authService.buscarUsuarioActual();

        // Obtener la URL de descarga de la imagen
        const imageUrl: string = await this.uploadImage(this.catFoto);

        if (imageUrl) {
          // Crear un documento en la colección de imágenes
          await setDoc(doc(getFirestore(), 'Usuario', uid), {
            Nombre: data['Nombre'],
            Apellido: data['Apellido'],
            Telefono: data['Telefono'],
            Rut: data['Rut'],
            DVRut: data['DVRut'],
            uid: data['uid'],
            Rol: data['Rol'],
            Foto: imageUrl,
          });
          console.log("Foto subida con exito")
        }

      } else {
        console.log("Es necesario iniciar sesión")
      }
    });
  }

  uploadImage(file: File) {
    const storageRef = ref(getStorage(), `images/${file.name}`);

    return uploadBytes(storageRef, file).then((snapshot) => {
      console.log('Uploaded a blob or file!');

      // Obtener la URL de descarga de la imagen
      console.log(getDownloadURL(storageRef));
      return getDownloadURL(storageRef);
    });
  }

  /*   async irDireccion() {
      this.router.navigate(['/user/direccion'])
    } */

  onTab4Init() {
    console.log("onTab4Init");
    this.init();
  }

  async onSubmit() {
    this.isSubmitted = true;
    console.log(this.userForm.value)

    this.nombreValido(this.userForm.value.name);
    this.apellidoValido(this.userForm.value.surname);
    this.telefonoValido(this.userForm.value.tfn);
    this.rutValido(this.userForm.value.rut);

    /*     this.calleValida(this.userForm.value.str);
        this.regionValida(this.userForm.value.region);
        this.comunaValida(this.userForm.value.comun); */

    let name = this.userForm.value.name;
    let surname = this.userForm.value.surname;
    let rut = this.userForm.value.rut;
    let dvrut = this.userForm.value.dvrut;
    let tfn = this.userForm.value.tfn;

    /*     let calle = this.userForm.value.str;
        let numero = this.userForm.value.number;
        let comuna = this.userForm.value.comun;
        let region = this.userForm.value.region;
        let cod_postal = this.userForm.value.cod; */

    let foto = this.catFoto;

    if (!this.userForm.valid) {
      console.log("not valid");
      return;
    }

    try {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        if (user) {

          const data = await this.authService.buscarUsuarioActual();

          await setDoc(doc(getFirestore(), "Usuario", user.uid), {
            Nombre: name,
            Apellido: surname,
            Telefono: tfn,
            Rut: rut,
            DVRut: dvrut,
            uid: data['uid'],
            Rol: data['Rol'],
            Foto: data['Foto'],
          });

          console.log("valid");
          this.alert.presentAlert("Guardado exitoso", "", "Se ha guardado exitosamente la información personal");

          this.router.navigate(['/tabs/tab4']);
        } else {
          console.error("user not authenticated");
        }
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }

  /* Validar Nombre*/
  nombreValido(name: any) {
    this.letra = name.charAt(0);
    if (!esMayuscula(this.letra)) {
      console.log("error nombre");
      this.userForm.controls['name'].setErrors({ 'errorMayus': true });
    }
  }


  /* Validar Apellido */
  apellidoValido(surname: any) {
    /* if (!validarNombre(surname)) {
      this.userForm.controls['surname'].setErrors({ 'errorNumero': true });
      console.log("error Apellido1");
    } */

    var letra = surname.charAt(0);
    if (!esMayuscula(letra)) {
      this.userForm.controls['surname'].setErrors({ 'errorMayus': true });
      console.log("error Apellido2");
    }
  }

  /* Validar Telefono*/
  telefonoValido(tlf: any) {
    if (tlf.toString().length != 9) {
      this.userForm.controls['tfn'].setErrors({ 'errorLargo': true });
    }
  }

  /* Validar rut */
  rutValido(rut: any) {
    if (rut.toString().length != 8) {
      this.userForm.controls['rut'].setErrors({ 'errorLargo': true });
    }
  }

  //////// Validar dirección ///////////
  // Validar Calle
  /*   calleValida(calle: any) {
      console.log("validacion direccion");
      var letra = calle.charAt(0);
      if (!esMayuscula(letra)) {
        console.log("error direccion");
        this.userForm.controls['str'].setErrors({ 'errorMayus': true });
      }
    }
  
    // Validar Region y Comuna
    regionValida(region: any) {
      console.log("validacion region");
      if (region === 'sin-region') {
        console.log("error region");
        this.userForm.controls['region'].setErrors({ 'errorNull': true });
      }
    }
  
    comunaValida(comun: any) {
      console.log("validacion comuna");
      if (comun === 'sin-comuna') {
        console.log("error comuna");
        this.userForm.controls['comun'].setErrors({ 'errorNull': true });
      }
    }
   */

  public validation_messages = {
    'name': [
      { type: 'required', message: 'El nombre es obligatorio' },
      { type: 'minlength', message: 'El nombre debe tene minimo 3 números' },
      { type: 'pattern', message: 'El nombre no debe tener caracteres especiales' },
      { type: 'errorMayus', message: 'La primera letra del nombre debe ser mayúscula' }
    ],
    'surname': [
      { type: 'required', message: 'El apellido es obligatoria' },
      { type: 'minlength', message: 'El apellido debe tene minimo 3 números' },
      { type: 'pattern', message: 'El apellido no debe tener caracteres especiales' },
      /* { type: 'errorNumero', message: 'El apellido no debe contener números' }, */
      { type: 'errorMayus', message: 'La primera letra del apellido debe ser mayúscula' }
    ],
    'email': [
      { type: 'required', message: 'El correo es obligatoria' },
      { type: 'email', message: 'El correo no es correcto' }
    ],
    'tfn': [
      { type: 'required', message: 'El telefono es obligatoria' },
      { type: 'errorLargo', message: 'El telefono debe tene 9 números' }

    ],
    'rut': [
      { type: 'required', message: 'El rut es obligatorio' },
      { type: 'errorLargo', message: 'El rut debe tener 8 números' }
    ],
    'dvrut': [
      { type: 'required', message: 'El digito verificador es obligatorio' },
      { type: 'pattern', message: 'El digito verificador debe ser un número o la letra "K"' }
    ],
    /*     'str': [
          { type: 'required', message: 'El nombre de la calle es obligatorio' },
          { type: 'pattern', message: 'La calle no puede tener caracteres especiales' },
          { type: 'required', message: 'La primera letra de la calle debe ser mayúscula' }
        ],
        'number': [
          { type: 'required', message: 'El número del domicilio es oblicatorio' },
          { type: 'minlength', message: 'La dirección debe tener 1 o más números' },
          { type: 'maxlength', message: 'La dirección debe tener 4 o menos números' }
        ],
        'region': [
          { type: 'required', message: 'La region es obligatoria' },
          { type: 'errorNull', message: 'Debe seleccionar una región' }
        ],
        'comun': [
          { type: 'required', message: 'La comuna es obligatoria' },
          { type: 'errorNull', message: 'Debe seleccionar una comuna' }
        ],
        'cod': [
          { type: 'required', message: 'El codigo postal es obligatorio' },
          { type: 'maxlength', message: 'El codigo postal solo debe tener 7 números' },
          { type: 'pattern', message: 'El codigo postal solo debe tener números' }
        ] */
  }
}

function esMayuscula(letra: string) {
  if (letra === letra.toUpperCase()) {
    return true;
  }
  else {
    return false;
  }

}
/* 
function validarNombre(name: string) {
  var regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/; // expresión regular que permite solo letras, espacios y tildes
  if (!regex.test(name)) {
    return false; // si el nombre contiene algún número u otro carácter no permitido, la validación falla
  }
  return true; // si el nombre es válido, la validación es exitosa
} */