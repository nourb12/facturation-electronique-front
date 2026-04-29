import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StepIndicatorMode = 'sidebar' | 'bar';

interface StepItem {
  id: 1 | 2 | 3;
  title: string;
  subtitle: string;
  label: string;
}

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.scss']
})
export class StepIndicatorComponent {
  @Input({ required: true }) currentStep!: 1 | 2 | 3;
  @Input() mode: StepIndicatorMode = 'sidebar';
  @Output() stepChange = new EventEmitter<1 | 2 | 3>();

  readonly steps: StepItem[] = [
    {
      id: 1,
      title: 'Informations entreprise',
      subtitle: 'Identité légale & coordonnées',
      label: 'Entreprise'
    },
    {
      id: 2,
      title: 'Responsable entreprise',
      subtitle: 'Profil du responsable légal',
      label: 'Responsable'
    },
    {
      id: 3,
      title: 'Documents justificatifs',
      subtitle: 'Pièces obligatoires & optionnelles',
      label: 'Documents'
    }
  ];

  isDone(step: number): boolean {
    return this.currentStep > step;
  }

  isActive(step: number): boolean {
    return this.currentStep === step;
  }

  canNavigateTo(step: number): boolean {
    return step < this.currentStep;
  }

  onStepClick(step: number): void {
    if (this.canNavigateTo(step)) {
      this.stepChange.emit(step as 1 | 2 | 3);
    }
  }
}
