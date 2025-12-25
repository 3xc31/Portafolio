import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TransCompletedPage } from './trans-completed.page';

const routes: Routes = [
  {
    path: '',
    component: TransCompletedPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransCompletedPageRoutingModule {}
