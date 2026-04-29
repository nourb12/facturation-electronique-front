
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  animations: [
    trigger('toastAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(.96)' }),
        animate('280ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ],
  template: `
    <div class="toast-container">
      @for (t of toastList; track t.id) {
        <div class="toast" [ngClass]="'toast--' + t.type" [@toastAnim]>
          <div class="toast-icon">
            @if (t.type === 'success') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            }
            @if (t.type === 'error') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            }
            @if (t.type === 'warning') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L1 12h12L7 1z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 5v3M7 10v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            }
            @if (t.type === 'info') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M7 6v4M7 4v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            }
          </div>
          <span class="toast-msg">{{ t.message | translate: t.params }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 9999; pointer-events: none;
    }
    :host-context(html[dir='rtl']) .toast-container { right: auto; left: 24px; }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 16px; border-radius: 10px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
      min-width: 260px; max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4);
      border: 1px solid transparent; pointer-events: all;
      &--success { background: rgba(34,197,94,.12);  border-color: rgba(34,197,94,.25);  color: #22C55E }
      &--error   { background: rgba(239,68,68,.12);  border-color: rgba(239,68,68,.25);  color: #EF4444 }
      &--warning { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.25); color: #F59E0B }
      &--info    { background: rgba(59,130,246,.12); border-color: rgba(59,130,246,.25); color: #3B82F6 }
    }
    .toast-icon {
      width: 22px; height: 22px; border-radius: 6px;
      background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .toast-msg { color: var(--tp); flex: 1; line-height: 1.4 }
  `]
})
export class ToastComponent {
  toastSvc = inject(ToastService);
  get toastList(): Toast[] { return this.toastSvc.toasts(); }
}
