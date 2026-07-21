import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendrierRoutingModule } from './calendrier-routing.module';

import { CalendrierPageComponent } from './components/calendrier-page/calendrier-page.component';
import { MiniCalendrierComponent } from './components/mini-calendrier/mini-calendrier.component';
import { CalGridComponent }         from './components/cal-grid/cal-grid.component';
import { CalCellComponent }         from './components/cal-cell/cal-cell.component';
import { SidebarRightComponent }    from './components/sidebar-right/sidebar-right.component';
import { EventFormModalComponent }  from './components/event-form-modal/event-form-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CalendrierRoutingModule,
    CalendrierPageComponent,
    MiniCalendrierComponent,
    CalGridComponent,
    CalCellComponent,
    SidebarRightComponent,
    EventFormModalComponent,
  ],
})
export class CalendrierModule {}
