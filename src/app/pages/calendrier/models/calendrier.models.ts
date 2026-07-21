export type EventType = 'invoice' | 'overdue' | 'meeting' | 'fiscal' | 'task' | 'zoom';
export type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface CalEvent {
  id: string | number;
  title: string;
  type: EventType;
  date: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  description?: string;
  linkedFactureId?: number;
  linkedClientName?: string;
  linkedAmount?: number;
  zoomLink?: string;
  participants?: string[];
  reminderMinutes?: number;
}

export interface CalTask {
  id: string | number;
  title: string;
  date: Date;
  done: boolean;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
}

export interface CalDayData {
  date: Date;
  events: CalEvent[];
  tasks: CalTask[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface DayKpis {
  overdueCount: number;
  weekEcheances: number;
  meetingsToday: number;
  tasksDoneToday: number;
  tasksTotalToday: number;
}

export const EVENT_META: Record<EventType, { label: string; color: string; bg: string; icon: string }> = {
  invoice: { label: 'Échéance facture', color: '#856800', bg: '#FFF3B0', icon: 'ti-file-invoice'  },
  overdue: { label: 'Facture impayée',  color: '#A32D2D', bg: '#FCEBEB', icon: 'ti-alert-triangle' },
  meeting: { label: 'Réunion',          color: '#185FA5', bg: '#E6F1FB', icon: 'ti-users'          },
  fiscal:  { label: 'Deadline fiscale', color: '#3B6D11', bg: '#EAF3DE', icon: 'ti-receipt-tax'    },
  task:    { label: 'Tâche interne',    color: '#5F5E5A', bg: '#F1EFE8', icon: 'ti-checklist'      },
  zoom:    { label: 'Réunion Zoom',     color: '#185FA5', bg: '#E6F1FB', icon: 'ti-video'          },
};
