import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { AlertsService } from 'src/app/services/alerts.service';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { environment } from 'src/environments/environment';
import { register } from 'swiper/element';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  email: string = "";
  password: string = "";
  pregunta: string = "";
  resp_secreta: string = "";

  arregloPreguntas: any[] = [
    {
      id: '',
      pregunta: ''
    }
  ]

  public registerForm = this.formBuilder.group({
    email: new FormControl('', {
      validators: [
        Validators.required,
        Validators.pattern("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
      ]
    }),
    password: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30),
        Validators.pattern("^(?=.*[a-z]).*$")
      ]
    }),
    password_conf: new FormControl('', {
      validators: [
        Validators.required
      ]
    })
  })

  isSubmitted = false;
  submitError = "";

  public alertButtons = ['OK'];

  isAlertOpen = false;

  constructor(private router: Router,
    private formBuilder: FormBuilder,
    public authService: AuthenticationService,
    private alert: AlertsService,
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
  }

  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
  }

  async onSubmit() {
    this.isSubmitted = true;

    await this.validarCorreo(this.registerForm.value.email);
    await this.claveValida(this.registerForm.value.password);
    await this.confClave(this.registerForm.value.password, this.registerForm.value.password_conf);

    if (!this.registerForm.valid) {
      console.log("not valid");
      return;
    }

    let correo = this.registerForm.value.email;
    let clave = this.registerForm.value.password;

    if (correo && clave) {
      try {
        const userCredential = await this.authService.registerUser(correo, clave);
        const user = userCredential.user
        if (user) {
          await this.authService.createUsuarioDocument(user);

          console.log("valid");
          this.setOpen(true);
          this.router.navigate(['/tabs/tab4']);
        } else {
          console.error('Error: User object is null');
          // Handle the error accordingly
        }
      } catch (error) {
        console.error('Error registering user:', error);
        if ((error as any).code === 'auth/email-already-in-use') {
          console.error('Error: Email is already in use');
          this.registerForm.controls['email'].setErrors({ 'errorDuplicado': true })
        }
      }
    }
  }

  claveValida(password: any) {
    if (/^(?=.*[A-Z]).*$/.test(password) == false) {
      this.registerForm.controls['password'].setErrors({ 'errorMayus': true })
    }
    if (/^(?=.*[!@#$&*_+.?~]).*$/.test(password) == false) {
      this.registerForm.controls['password'].setErrors({ 'errorCarEspecial': true })
    }
    if (/^(?=.*[\d*]).*$/.test(password) == false) {
      this.registerForm.controls['password'].setErrors({ 'errorNumerico': true })
    }
  }

  confClave(password: any, password_conf: any) {
    if (password !== password_conf) {
      this.registerForm.controls['password_conf'].setErrors({ 'errorConf': true })
    }
  }

  async validarCorreo(correo: any) {
    try {
      const correoDisponible = await this.authService.encontrarUsuario(correo);
      if (!correoDisponible) {
        this.registerForm.controls['email'].setErrors({ 'errorDuplicado': true })
      } else {
        this.registerForm.controls['email'].setErrors({ 'errorDuplicado': false });
      }
    } catch (error) {
      this.alert.presentAlert("Error", "Error de validación", "Error al verificar la disponibilidad del correo electrónico.");
    }
  }

  public validation_messages = {
    'email': [
      { type: 'required', message: 'El correo es obligatorio' },
      { type: 'pattern', message: 'El correo no cumple con el patron' },
      { type: 'errorDuplicado', message: 'El correo ya esta en uso en otra cuenta' },
    ],
    'password': [
      { type: 'required', message: 'La contraseña es obligatoria' },
      { type: 'minlength', message: 'La contraseña debe tener 8 o más caracteres' },
      { type: 'maxlength', message: 'La contraseña debe tener 30 o menos caracteres' },
      { type: 'pattern', message: 'La contraseña debe llevar una una minuscula' },
      { type: 'errorMayus', message: 'La contraseña debe llevar una mayuscula' },
      { type: 'errorCarEspecial', message: 'La contraseña debe llevar un caracter especial' },
      { type: 'errorNumerico', message: 'La contraseña debe llevar un número' },
    ],
    'password_conf': [
      { type: 'required', message: 'La confirmación de contraseña es obligatoria' },
      { type: 'errorConf', message: 'La contraseña debe coincidir con la contraseña elegida' }
    ]
  }
}
