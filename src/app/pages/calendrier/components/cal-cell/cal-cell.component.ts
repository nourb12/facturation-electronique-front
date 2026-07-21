import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalDayData, CalEvent, EVENT_META } from '../../models/calendrier.models';
import { CalendrierService } from '../../services/calendrier.service';

@Component({
  selector: 'app-cal-cell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cal-cell.component.html',
  styleUrls: ['./cal-cell.component.scss'],
})
export class CalCellComponent {
  @Input() day!: CalDayData;

  svc = inject(CalendrierService);
  META = EVENT_META;
  MAX_VISIBLE = 3;

  get visibleEvents(): CalEvent[] {
    return this.day.events.slice(0, this.MAX_VISIBLE);
  }

  get hiddenCount(): number {
    return Math.max(0, this.day.events.length - this.MAX_VISIBLE);
  }

  get isSelected(): boolean {
    const s = this.svc.selectedDate();
    const d = this.day.date;
    return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
  }

  selectDay() {
    this.svc.selectedDate.set(this.day.date);
  }

  openEvent(evt: CalEvent, e: MouseEvent) {
    e.stopPropagation();
    this.svc.openModal(evt);
  }

  getEventLabel(evt: CalEvent): string {
    const icon = this.META[evt.type]?.icon ?? '';
    return evt.title;
  }
}
