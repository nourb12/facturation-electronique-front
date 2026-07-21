import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CalEvent, CalTask, CalDayData, DayKpis, ViewMode } from '../models/calendrier.models';

@Injectable({ providedIn: 'root' })
export class CalendrierService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/calendrier`;

  currentDate   = signal<Date>(new Date());
  selectedDate  = signal<Date>(new Date());
  viewMode      = signal<ViewMode>('month');
  showModal     = signal<boolean>(false);
  editingEvent  = signal<CalEvent | null>(null);

  private _events = signal<CalEvent[]>([
    { id: 1,  type: 'fiscal',  title: 'Déclaration TVA avril',       date: new Date(2026, 4, 1),  startTime: '09:00', endTime: '10:00' },
    { id: 2,  type: 'invoice', title: 'Échéance FAC-2026-012',        date: new Date(2026, 4, 5),  linkedClientName: 'Ooredoo TN',   linkedAmount: 4800 },
    { id: 3,  type: 'zoom',    title: 'Zoom client STEG',             date: new Date(2026, 4, 7),  startTime: '10:00', endTime: '11:00', zoomLink: 'https://zoom.us/j/123456' },
    { id: 4,  type: 'overdue', title: 'FAC-2026-009 impayée',         date: new Date(2026, 4, 9),  linkedClientName: 'Tunisie Télécom', linkedAmount: 2300 },
    { id: 5,  type: 'meeting', title: 'Réunion EY — bilan Q2',        date: new Date(2026, 4, 12), startTime: '10:00', endTime: '11:00' },
    { id: 6,  type: 'invoice', title: 'Échéance FAC-2026-018',        date: new Date(2026, 4, 12), linkedClientName: 'Poulina Group',  linkedAmount: 7200 },
    { id: 7,  type: 'task',    title: 'Rapport mensuel à envoyer',    date: new Date(2026, 4, 12) },
    { id: 8,  type: 'task',    title: 'Clôture comptabilité avril',   date: new Date(2026, 4, 13) },
    { id: 9,  type: 'invoice', title: 'Échéance FAC-2026-020',        date: new Date(2026, 4, 15), linkedClientName: 'STEG',           linkedAmount: 3100 },
    { id: 10, type: 'invoice', title: 'Échéance FAC-2026-021',        date: new Date(2026, 4, 15), linkedClientName: 'SONEDE',         linkedAmount: 1900 },
    { id: 11, type: 'zoom',    title: 'Zoom fournisseur BT',          date: new Date(2026, 4, 19), startTime: '14:00', endTime: '15:00', zoomLink: 'https://zoom.us/j/789012' },
    { id: 12, type: 'overdue', title: 'FAC-2026-011 impayée',         date: new Date(2026, 4, 22), linkedClientName: 'Délice Holding', linkedAmount: 5600 },
    { id: 13, type: 'fiscal',  title: 'Déclaration RS mai',           date: new Date(2026, 4, 28), startTime: '09:00' },
    { id: 14, type: 'meeting', title: 'Revue budget S2',              date: new Date(2026, 4, 26), startTime: '15:00', endTime: '16:30' },
  ]);

  private _tasks = signal<CalTask[]>([
    { id: 1, title: 'Vérifier FAC-2026-015',      date: new Date(2026, 4, 12), done: true,  priority: 'normal',  createdAt: new Date() },
    { id: 2, title: 'Relancer client STEG',        date: new Date(2026, 4, 12), done: false, priority: 'high',    createdAt: new Date() },
    { id: 3, title: 'Valider export comptable',    date: new Date(2026, 4, 12), done: false, priority: 'normal',  createdAt: new Date() },
    { id: 4, title: 'Envoyer rapport mensuel',     date: new Date(2026, 4, 12), done: false, priority: 'high',    createdAt: new Date() },
  ]);

  private _nextId = 100;

  events  = computed(() => this._events());
  tasks   = computed(() => this._tasks());

  load() {
    forkJoin({
      events: this.http.get<ApiCalEvent[]>(`${this.apiUrl}/events`).pipe(catchError(() => of(null))),
      tasks: this.http.get<ApiCalTask[]>(`${this.apiUrl}/tasks`).pipe(catchError(() => of(null))),
    }).subscribe(({ events, tasks }) => {
      if (events) this._events.set(events.map(this.mapEventFromApi));
      if (tasks) this._tasks.set(tasks.map(this.mapTaskFromApi));
    });
  }

  getEventsForDate(date: Date): CalEvent[] {
    return this._events().filter(e => this._sameDay(e.date, date));
  }

  getTasksForDate(date: Date): CalTask[] {
    return this._tasks().filter(t => this._sameDay(t.date, date));
  }

  getDayKpis(date: Date): DayKpis {
    const all = this._events();
    const today = new Date();
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 6);
    return {
      overdueCount:    all.filter(e => e.type === 'overdue').length,
      weekEcheances:   all.filter(e => e.type === 'invoice' && e.date >= today && e.date <= weekEnd).length,
      meetingsToday:   all.filter(e => (e.type === 'meeting' || e.type === 'zoom') && this._sameDay(e.date, date)).length,
      tasksDoneToday:  this._tasks().filter(t => this._sameDay(t.date, date) && t.done).length,
      tasksTotalToday: this._tasks().filter(t => this._sameDay(t.date, date)).length,
    };
  }

  buildMonthGrid(year: number, month: number): CalDayData[] {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const today    = new Date();
    const grid: CalDayData[] = [];

    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      grid.push({ date: d, events: this.getEventsForDate(d), tasks: this.getTasksForDate(d), isToday: false, isCurrentMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      grid.push({ date: dt, events: this.getEventsForDate(dt), tasks: this.getTasksForDate(dt), isToday: this._sameDay(dt, today), isCurrentMonth: true });
    }
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      grid.push({ date: d, events: this.getEventsForDate(d), tasks: this.getTasksForDate(d), isToday: false, isCurrentMonth: false });
    }
    return grid;
  }

  addEvent(evt: Omit<CalEvent, 'id'>) {
    const tempId = this._nextId++;
    this._events.update(evts => [...evts, { ...evt, id: tempId }]);
    this.http.post<ApiCalEvent>(`${this.apiUrl}/events`, this.mapEventToApi(evt))
      .pipe(catchError(() => of(null)))
      .subscribe(saved => {
        if (saved) {
          this._events.update(evts => evts.map(e => e.id === tempId ? this.mapEventFromApi(saved) : e));
        }
      });
  }

  removeEvent(id: string | number) {
    this.http.delete(`${this.apiUrl}/events/${id}`).pipe(catchError(() => of(null))).subscribe();
    this._events.update(evts => evts.filter(e => e.id !== id));
  }

  addTask(title: string, date: Date) {
    const tempId = this._nextId++;
    const task: CalTask = { id: tempId, title, date, done: false, priority: 'normal', createdAt: new Date() };
    this._tasks.update(t => [...t, task]);
    this.http.post<ApiCalTask>(`${this.apiUrl}/tasks`, {
      title,
      date: this.toDateOnly(date),
      priority: 'normal',
    }).pipe(catchError(() => of(null))).subscribe(saved => {
      if (saved) this._tasks.update(tasks => tasks.map(t => t.id === tempId ? this.mapTaskFromApi(saved) : t));
    });
  }

  toggleTask(id: string | number) {
    const current = this._tasks().find(t => t.id === id);
    this.http.patch<ApiCalTask>(`${this.apiUrl}/tasks/${id}`, { done: current ? !current.done : undefined })
      .pipe(catchError(() => of(null)))
      .subscribe(saved => {
        if (saved) this._tasks.update(tasks => tasks.map(t => t.id === id ? this.mapTaskFromApi(saved) : t));
      });
    this._tasks.update(tasks => tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  removeTask(id: string | number) {
    this.http.delete(`${this.apiUrl}/tasks/${id}`).pipe(catchError(() => of(null))).subscribe();
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
  }

  prevMonth() {
    this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToday() {
    this.currentDate.set(new Date());
    this.selectedDate.set(new Date());
  }

  openModal(event?: CalEvent) {
    this.editingEvent.set(event ?? null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingEvent.set(null);
  }

  private _sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private mapEventFromApi(evt: ApiCalEvent): CalEvent {
    return {
      id: evt.id,
      title: evt.title,
      type: evt.type as CalEvent['type'],
      date: new Date(`${evt.date}T00:00:00`),
      startTime: evt.startTime ?? undefined,
      endTime: evt.endTime ?? undefined,
      linkedClientName: evt.linkedClientName ?? undefined,
      linkedAmount: evt.linkedAmount ?? undefined,
      zoomLink: evt.zoomLink ?? undefined,
      reminderMinutes: evt.reminderMinutes ?? undefined,
    };
  }

  private mapTaskFromApi(task: ApiCalTask): CalTask {
    return {
      id: task.id,
      title: task.title,
      date: new Date(`${task.date}T00:00:00`),
      done: task.done,
      priority: task.priority as CalTask['priority'],
      createdAt: new Date(),
    };
  }

  private mapEventToApi(evt: Omit<CalEvent, 'id'>) {
    return {
      title: evt.title,
      date: this.toDateOnly(evt.date),
      type: evt.type,
      startTime: evt.startTime,
      endTime: evt.endTime,
      linkedClientName: evt.linkedClientName,
      linkedAmount: evt.linkedAmount,
      zoomLink: evt.zoomLink,
      reminderMinutes: evt.reminderMinutes,
    };
  }

  private toDateOnly(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

interface ApiCalEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  linkedClientName?: string | null;
  linkedAmount?: number | null;
  zoomLink?: string | null;
  reminderMinutes?: number | null;
}

interface ApiCalTask {
  id: string;
  title: string;
  date: string;
  done: boolean;
  priority: string;
}
