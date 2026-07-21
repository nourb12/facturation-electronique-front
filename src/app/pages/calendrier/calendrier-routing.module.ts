import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CalendrierPageComponent } from './components/calendrier-page/calendrier-page.component';

const routes: Routes = [{ path: '', component: CalendrierPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CalendrierRoutingModule {}
