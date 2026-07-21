import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { KanbanComponent } from '../../kanban.component';
import { CalendrierService } from '../../services/calendrier.service';
import { CalGridComponent } from '../cal-grid/cal-grid.component';
import { EventFormModalComponent } from '../event-form-modal/event-form-modal.component';
import { MiniCalendrierComponent } from '../mini-calendrier/mini-calendrier.component';
import { SidebarRightComponent } from '../sidebar-right/sidebar-right.component';

@Component({
  selector: 'app-calendrier-page',
  standalone: true,
  imports: [
    CommonModule,
    MiniCalendrierComponent,
    CalGridComponent,
    SidebarRightComponent,
    EventFormModalComponent,
    KanbanComponent,
  ],
  templateUrl: './calendrier-page.component.html',
  styleUrls: ['./calendrier-page.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('240ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CalendrierPageComponent implements OnInit {
  svc = inject(CalendrierService);
  activeWorkspace = signal<'calendar' | 'kanban'>('calendar');

  ngOnInit() {
    this.svc.load();
  }

  monthLabel = computed(() =>
    this.svc.currentDate().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  );

  views = [
    { key: 'month', label: 'Mois' },
    { key: 'week', label: 'Semaine' },
    { key: 'day', label: 'Jour' },
    { key: 'agenda', label: 'Agenda' },
  ];

  legendItems = [
    { type: 'invoice', color: '#E8C84A', label: 'Échéance facture' },
    { type: 'overdue', color: '#E24B4A', label: 'Facture impayée' },
    { type: 'meeting', color: '#378ADD', label: 'Réunion / Zoom' },
    { type: 'fiscal', color: '#639922', label: 'Deadline fiscale' },
    { type: 'task', color: '#888780', label: 'Tâche interne' },
  ];
}
