import { Injectable, signal } from '@angular/core';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  config = signal<ConfirmationConfig | null>(null);
  isProcessing = signal(false);

  confirm(config: ConfirmationConfig) {
    this.config.set({
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      confirmClass: 'danger',
      ...config
    });
  }

  cancel() {
    const currentConfig = this.config();
    if (currentConfig?.onCancel) {
      currentConfig.onCancel();
    }
    this.config.set(null);
    this.isProcessing.set(false);
  }

  async executeConfirm() {
    const currentConfig = this.config();
    if (!currentConfig || this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      await currentConfig.onConfirm();
      this.config.set(null);
    } catch (error) {
      // Error handled by the caller
    } finally {
      this.isProcessing.set(false);
    }
  }
}
