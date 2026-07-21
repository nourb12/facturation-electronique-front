import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendrierService } from '../../services/calendrier.service';
import { EVENT_META } from '../../models/calendrier.models';

@Component({
  selector: 'app-sidebar-right',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-right.component.html',
  styleUrls: ['./sidebar-right.component.scss'],
})
export class SidebarRightComponent {
  svc = inject(CalendrierService);
  META = EVENT_META;

  newTaskTitle = signal('');

  selectedLabel = computed(() => {
    const d = this.svc.selectedDate();
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  });

  selectedEvents = computed(() => this.svc.getEventsForDate(this.svc.selectedDate()));
  selectedTasks  = computed(() => this.svc.getTasksForDate(this.svc.selectedDate()));
  kpis           = computed(() => this.svc.getDayKpis(this.svc.selectedDate()));

  addTask() {
    const title = this.newTaskTitle().trim();
    if (!title) return;
    this.svc.addTask(title, this.svc.selectedDate());
    this.newTaskTitle.set('');
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this.addTask();
  }

  editEvent(id: string | number) {
    const evt = this.svc.events().find(e => e.id === id);
    if (evt) this.svc.openModal(evt);
  }

  deleteEvent(id: string | number) {
    if (confirm('Supprimer cet événement ?')) this.svc.removeEvent(id);
  }

  deleteTask(id: string | number) {
    this.svc.removeTask(id);
  }

  getPriorityColor(p: string): string {
    return p === 'high' ? '#E24B4A' : p === 'normal' ? '#E8C84A' : '#888780';
  }
}
