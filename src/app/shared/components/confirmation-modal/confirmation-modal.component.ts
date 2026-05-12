import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.config()) {
      <div class="modal-overlay" [@fadeIn] (click)="confirmService.cancel()">
        <div class="modal-box" (click)="$event.stopPropagation()" [@slideUp]>
          <div class="modal-icon" [ngClass]="'modal-icon--' + confirmService.config()!.confirmClass">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="modal-title">{{ confirmService.config()!.title }}</h3>
          <p class="modal-message">{{ confirmService.config()!.message }}</p>
          <div class="modal-actions">
            <button class="btn-modal btn-modal--cancel" type="button" (click)="confirmService.cancel()">
              {{ confirmService.config()!.cancelText }}
            </button>
            <button 
              class="btn-modal" 
              [ngClass]="'btn-modal--' + confirmService.config()!.confirmClass"
              type="button" 
              (click)="confirmService.executeConfirm()" 
              [disabled]="confirmService.isProcessing()">
              @if (confirmService.isProcessing()) {
                <span class="btn-spinner"></span>
                Suppression…
              } @else {
                {{ confirmService.config()!.confirmText }}
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-box {
      background: var(--bg-card);
      border: 1px solid var(--b1);
      border-radius: 16px;
      padding: 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, .2);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
    }

    .modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .modal-icon--danger {
      background: rgba(239, 68, 68, .12);
      color: #EF4444;
      border: 1.5px solid rgba(239, 68, 68, .25);
    }

    .modal-icon--warning {
      background: rgba(245, 158, 11, .12);
      color: #F59E0B;
      border: 1.5px solid rgba(245, 158, 11, .25);
    }

    .modal-icon--primary {
      background: rgba(var(--c-tuniflow-rgb), .12);
      color: var(--c-tuniflow);
      border: 1.5px solid rgba(var(--c-tuniflow-rgb), .25);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--tp);
      margin: 0;
    }

    .modal-message {
      font-size: 13px;
      color: var(--ts);
      line-height: 1.6;
      margin: 0;
      max-width: 340px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      width: 100%;
      margin-top: 8px;
    }

    .btn-modal {
      flex: 1;
      padding: 11px 18px;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s cubic-bezier(.16,1,.3,1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
    }

    .btn-modal--cancel {
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      color: var(--ts);
    }

    .btn-modal--cancel:hover {
      background: var(--bg-edge);
      color: var(--tp);
    }

    .btn-modal--danger {
      background: #EF4444;
      color: #fff;
    }

    .btn-modal--danger:hover:not(:disabled) {
      background: #DC2626;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(239, 68, 68, .35);
    }

    .btn-modal--warning {
      background: #F59E0B;
      color: #fff;
    }

    .btn-modal--warning:hover:not(:disabled) {
      background: #D97706;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, .35);
    }

    .btn-modal--primary {
      background: var(--c-tuniflow);
      color: var(--tuniflow-btn-text);
    }

    .btn-modal--primary:hover:not(:disabled) {
      background: var(--c-tuniflow-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(var(--c-tuniflow-rgb), .35);
    }

    .btn-modal:disabled {
      opacity: .6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, .3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('250ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class ConfirmationModalComponent {
  confirmService = inject(ConfirmationService);
}
