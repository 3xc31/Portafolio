import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TransCompletedPageRoutingModule } from './trans-completed-routing.module';

import { TransCompletedPage } from './trans-completed.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TransCompletedPageRoutingModule
  ],
  declarations: [TransCompletedPage]
})
export class TransCompletedPageModule {}
