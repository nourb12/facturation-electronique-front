import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  params?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private next = 0;

  show(type: Toast['type'], message: string, duration = 3500, params?: Toast['params']) {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, type, message, params }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(msg: string) { this.show('success', msg); }
  error(msg: string)   { this.show('error', msg); }
  warning(msg: string) { this.show('warning', msg); }
  info(msg: string)    { this.show('info', msg); }

  successKey(key: string, params?: Toast['params'], duration?: number) { this.show('success', key, duration, params); }
  errorKey(key: string, params?: Toast['params'], duration?: number)   { this.show('error', key, duration, params); }
  warningKey(key: string, params?: Toast['params'], duration?: number) { this.show('warning', key, duration, params); }
  infoKey(key: string, params?: Toast['params'], duration?: number)    { this.show('info', key, duration, params); }

  private remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
