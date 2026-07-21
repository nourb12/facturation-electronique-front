import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendrierService } from '../../services/calendrier.service';
import { CalCellComponent } from '../cal-cell/cal-cell.component';

@Component({
  selector: 'app-cal-grid',
  standalone: true,
  imports: [CommonModule, CalCellComponent],
  templateUrl: './cal-grid.component.html',
  styleUrls: ['./cal-grid.component.scss'],
})
export class CalGridComponent {
  svc = inject(CalendrierService);
  DAY_HEADERS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  grid = computed(() => {
    const d = this.svc.currentDate();
    return this.svc.buildMonthGrid(d.getFullYear(), d.getMonth());
  });
}
