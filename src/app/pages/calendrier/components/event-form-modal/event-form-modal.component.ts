import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendrierService } from '../../services/calendrier.service';
import { CalEvent, EventType } from '../../models/calendrier.models';

@Component({
  selector: 'app-event-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-form-modal.component.html',
  styleUrls: ['./event-form-modal.component.scss'],
})
export class EventFormModalComponent implements OnInit {
  svc = inject(CalendrierService);

  isEdit = false;
  editId: string | number | null = null;

  form = signal({
    title: '',
    type: 'meeting' as EventType,
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    zoomLink: '',
    linkedClientName: '',
    linkedAmount: null as number | null,
    reminderMinutes: 30,
  });

  eventTypes: Array<{ key: EventType; label: string; icon: string }> = [
    { key: 'meeting', label: 'Réunion',          icon: 'ti-users'           },
    { key: 'zoom',    label: 'Zoom / Meet',       icon: 'ti-video'           },
    { key: 'task',    label: 'Tâche interne',     icon: 'ti-checklist'       },
    { key: 'fiscal',  label: 'Deadline fiscale',  icon: 'ti-receipt-tax'     },
    { key: 'invoice', label: 'Échéance facture',  icon: 'ti-file-invoice'    },
    { key: 'overdue', label: 'Facture impayée',   icon: 'ti-alert-triangle'  },
  ];

  reminderOptions = [
    { value: 0,    label: 'Aucun rappel'   },
    { value: 15,   label: '15 min avant'   },
    { value: 30,   label: '30 min avant'   },
    { value: 60,   label: '1h avant'       },
    { value: 1440, label: '1 jour avant'   },
  ];

  showZoomField = computed(() => this.form().type === 'zoom' || this.form().type === 'meeting');
  showInvoiceFields = computed(() => this.form().type === 'invoice' || this.form().type === 'overdue');

  ngOnInit() {
    const editing = this.svc.editingEvent();
    const sel = this.svc.selectedDate();
    if (editing) {
      this.isEdit = true;
      this.editId = editing.id;
      const d = editing.date;
      const pad = (n: number) => String(n).padStart(2,'0');
      this.form.set({
        title: editing.title,
        type: editing.type,
        date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        startTime: editing.startTime ?? '',
        endTime: editing.endTime ?? '',
        description: editing.description ?? '',
        zoomLink: editing.zoomLink ?? '',
        linkedClientName: editing.linkedClientName ?? '',
        linkedAmount: editing.linkedAmount ?? null,
        reminderMinutes: editing.reminderMinutes ?? 30,
      });
    } else {
      const pad = (n: number) => String(n).padStart(2,'0');
      this.form.update(f => ({
        ...f,
        date: `${sel.getFullYear()}-${pad(sel.getMonth()+1)}-${pad(sel.getDate())}`,
      }));
    }
  }

  updateField(key: string, value: any) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  save() {
    const f = this.form();
    if (!f.title.trim() || !f.date) return;
    const dateObj = new Date(f.date + 'T00:00:00');
    const payload: Omit<CalEvent, 'id'> = {
      title: f.title.trim(),
      type: f.type,
      date: dateObj,
      startTime: f.startTime || undefined,
      endTime: f.endTime || undefined,
      description: f.description || undefined,
      zoomLink: f.zoomLink || undefined,
      linkedClientName: f.linkedClientName || undefined,
      linkedAmount: f.linkedAmount ?? undefined,
      reminderMinutes: f.reminderMinutes,
    };
    if (this.isEdit && this.editId !== null) {
      this.svc.removeEvent(this.editId);
    }
    this.svc.addEvent(payload);
    this.svc.closeModal();
  }

  close() { this.svc.closeModal(); }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.close();
  }
}
