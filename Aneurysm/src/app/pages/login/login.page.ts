import { Component, OnInit } from '@angular/core';
import { user } from '@angular/fire/auth';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { AlertsService } from 'src/app/services/alerts.service';
import { AuthenticationService } from 'src/app/services/authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  email: string = "";
  password: string = "";

  nombre: string = "Administrador Aneurysm"
  correo: string = "aneurysm@gmail.com";
  clave: string = "Aneurysm45*";

  loginForm = this.formBuilder.group({
    email: new FormControl('', {
      validators: [
        Validators.required,
        Validators.pattern("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
      ]
    }),
    password: new FormControl('', {
      validators: [
        Validators.required,
        Validators.pattern("^(?=.*[a-z]).*$")
      ]
    })
  })

  isSubmitted = false;
  submitError = "";

  constructor(private router: Router,
    private formBuilder: FormBuilder,
    public authService: AuthenticationService,
    private alert: AlertsService
  ) {
  }

  ngOnInit() {
  }

  irfgpssw() {
    this.router.navigate(['/fgpssw']);
  }

  async onSubmit() {
    this.isSubmitted = true;

    if (!this.loginForm.valid) {
      console.log("not valid");
      return;
    }

    try {
      let correo = this.loginForm.value.email;
      let password = this.loginForm.value.password;

      if (correo && password) {
        this.authService.loginUser(correo, password).then((errorCode) => {
          if (errorCode) {
            if (errorCode === "auth/invalid-credential") {
              // Handle error code
              this.loginForm.controls['password'].setErrors({ 'incorrect': true })
              console.log("Error code:", errorCode);

              if (errorCode === "auth/too-many-requests") {
                this.loginForm.controls['password'].setErrors({ 'tooMany': true })

              }
            }
          } else {
            this.authService.setUser(user);
            this.router.navigate(['/tabs/tab4']);
          }
        });
      } else {
        this.loginForm.controls['password'].setErrors({ 'notMatch': true })
        return;
      }
    } catch {
      this.alert.presentAlert("Error", "Error en la base de datos", "Error al buscar el correo en la base de datos");
    }
  }

  public validation_messages = {
    'email': [
      { type: 'required', message: 'El correo es obligatorio' },
      { type: 'pattern', message: 'El correo no es un correo valido' }
    ],
    'password': [
      { type: 'required', message: 'La contraseña es obligatoria' },
      { type: 'pattern', message: 'La contraseña no es una contraseña valida' },
      { type: 'notMatch', message: 'El correo o la contraseña no son validas' },
      { type: 'incorrect', message: 'La contraseña no es correcta' },
      { type: 'tooMany', message: 'Demasiados intentos, prueba más tarde' },
    ]
  }
}
