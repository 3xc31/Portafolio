import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {

  constructor(private alertController: AlertController) { }

  async presentAlert(head: string, subhead: string, msj: string) {
    const alert = await this.alertController.create({
      header: head,
      subHeader: subhead,
      message: msj,
      buttons: ['OK'],
    });

    await alert.present();
  }
}
