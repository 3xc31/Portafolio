import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { AuthenticationService } from 'src/app/services/authentication.service';

@Component({
  selector: 'app-fgpssw',
  templateUrl: './fgpssw.page.html',
  styleUrls: ['./fgpssw.page.scss'],
})
export class FgpsswPage implements OnInit {
  email: string = "";
  resp_secreta: string = "";

  isAlertOpen = false;
  public alertButtons = ['OK'];

  isModalOpen: boolean = false;

  public registerForm = this.formBuilder.group({
    email: new FormControl('', {
      validators: [
        Validators.required,
        Validators.pattern("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
      ]
    })
  })

  isSubmitted = false;
  submitError = "";

  constructor(private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService) {
  }

  ngOnInit() {
  }


  async onSubmit() {
    this.isSubmitted = true;
    console.log(this.registerForm.value);

    if (!this.registerForm.valid) {
      console.log("not valid");
      return;
    }

    const correo = this.registerForm.value.email

    if (correo) {
      this.authService.resetPassword(correo).then(() => {
        console.log("Reestablecimiento de contraseña enviado");
        this.isAlertOpen = true;
      }
      ).catch((error) => {
        console.log(error);
      })
    }
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) {
      this.isAlertOpen = false;
    }
    this.router.navigate(['/login'])
  }

  public validation_messages = {
    'email': [
      { type: 'required', message: 'El correo es obligatorio' },
      { type: 'pattern', message: 'El correo no cumple con el patron' },
      { type: 'notExist', message: 'No existe una cuenta asociada a este correo' },
    ]
  }
}
