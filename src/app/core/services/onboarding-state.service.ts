












import { Injectable, signal, computed } from '@angular/core';

export type RoleKey =
  | 'entreprise'
  | 'financier'
  | 'commercial'
  | 'auditeur'
  | 'autre';

export interface OnboardingPreFill {
  prenom:       string;
  nom:          string;
  respPrenom:   string;
  respNom:      string;
  respFonction: string;
  roleKey:      RoleKey | null;
}

const EMPTY: OnboardingPreFill = {
  prenom: '', nom: '',
  respPrenom: '', respNom: '', respFonction: '',
  roleKey: null,
};

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {

  private readonly _state = signal<OnboardingPreFill>({ ...EMPTY });

  
  readonly state = computed(() => this._state());

  
  patchFromRoleSelection(patch: Partial<OnboardingPreFill>): void {
    this._state.update(s => ({ ...s, ...patch }));
  }

  
  reset(): void {
    this._state.set({ ...EMPTY });
  }

  
  get requiresWizard(): boolean {
    return this._state().roleKey === 'entreprise';
  }
}