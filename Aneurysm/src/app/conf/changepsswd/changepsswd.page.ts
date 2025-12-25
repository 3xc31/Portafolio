import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { getAuth, updatePassword } from 'firebase/auth';
import { AlertsService } from 'src/app/services/alerts.service';

@Component({
  selector: 'app-changepsswd',
  templateUrl: './changepsswd.page.html',
  styleUrls: ['./changepsswd.page.scss'],
})
export class ChangepsswdPage implements OnInit {
  claveRep1: string = "";
  claveRep2: string = "";


  changePassForm = this.formBuilder.group({
    claveRep1: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30),
        Validators.pattern("^(?=.*[a-z]).*$")
      ]
    }),
    claveRep2: new FormControl('', {
      validators: [
        Validators.required
      ]
    })
  })

  isAlertOpen = false;
  public alertButtons = ['OK'];

  isSubmitted = false;
  submitError = "";
  userID: any;
  claveVieja: any;

  constructor(
    private router: Router,
    private alerta: AlertController,
    private formBuilder: FormBuilder,
    private alert: AlertsService
  ) { }

  ngOnInit() {
  }

  async onSubmit() {
    this.isSubmitted = true;
    const auth = getAuth();
    const user = auth.currentUser;

    //Es necesario validar que 'user' no sea nulo
    if (user === null) {
      this.alert.presentAlert("Error", "", "No existe usuario asociado al correo ingresado");
      return;
    }

    //Se validan los valores
    this.claveValida(this.changePassForm.value.claveRep1);
    this.confClave(this.changePassForm.value.claveRep1, this.changePassForm.value.claveRep2);

    if (!this.changePassForm.valid) {
      console.log("not valid");
      return;
    }

    //Hay que comprobar que el valor de 'claveRep1' existe
    if (this.changePassForm.value.claveRep1) {
      let newPassword: string = this.changePassForm.value.claveRep1;

      //Se cambia la contraseña
      updatePassword(user, newPassword).then(() => {  
      console.log("valid");
      this.isAlertOpen = true;

      }).catch((error) => {
        this.alert.presentAlert("Error", "", error);
      });
    }
  }

  isOpen(state: boolean) {
    if (state === false) {
      this.router.navigate(['/tabs/tab4'])
    }
  }

  claveValida(claveRep1: any) {
    if (/^(?=.*[A-Z]).*$/.test(claveRep1) == false) {
      this.changePassForm.controls['claveRep1'].setErrors({ 'errorMayus': true })
    }
    if (/^(?=.*[!@#$&*_+.?~]).*$/.test(claveRep1) == false) {
      this.changePassForm.controls['claveRep1'].setErrors({ 'errorCarEspecial': true })
    }
    if (/^(?=.*[\d*]).*$/.test(claveRep1) == false) {
      this.changePassForm.controls['claveRep1'].setErrors({ 'errorNumerico': true })
    }
  }

  confClave(claveRep1: any, claveRep2: any) {
    if (claveRep1 !== claveRep2) {
      this.changePassForm.controls['claveRep2'].setErrors({ 'notMatch': true })
    }
  }

  public validation_messages = {
    'claveRep1': [
      { type: 'required', message: 'La primera contraseña es obligatoria' },
      { type: 'minlength', message: 'La nueva contraseña debe tener 8 o más caracteres' },
      { type: 'maxlength', message: 'La nueva contraseña debe tener 30 o menos caracteres' },
      { type: 'pattern', message: 'La nueva contraseña debe llevar una una minuscula' },
      { type: 'errorMayus', message: 'La nueva contraseña debe llevar una mayuscula' },
      { type: 'errorCarEspecial', message: 'La nueva contraseña debe llevar un caracter especial' },
      { type: 'errorNumerico', message: 'La nueva contraseña debe llevar un número' },
    ],
    'claveRep2': [
      { type: 'required', message: 'La confirmación de contraseña es obligatoria' },
      { type: 'notMatch', message: 'La contraseña debe coincidir con la contraseña elegida' }
    ]
  }

}
