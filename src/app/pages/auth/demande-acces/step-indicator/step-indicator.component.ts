import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { WizardStep } from '../demande-acces.component';

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.scss']
})
export class StepIndicatorComponent {
  @Input({ required: true }) steps: WizardStep[] = [];
  @Input({ required: true }) current = 1;
  @Input() mode: 'sidebar' | 'bar' = 'sidebar';
  @Output() stepClick = new EventEmitter<WizardStep['id']>();

  get progressPct(): number {
    return this.steps.length ? Math.round((this.current / this.steps.length) * 100) : 0;
  }

  isDone(step: WizardStep): boolean {
    return this.current > step.id;
  }

  isActive(step: WizardStep): boolean {
    return this.current === step.id;
  }

  canClick(step: WizardStep): boolean {
    return this.current > step.id;
  }

  onStepActivate(step: WizardStep): void {
    if (!this.canClick(step)) return;
    this.stepClick.emit(step.id);
  }
}
