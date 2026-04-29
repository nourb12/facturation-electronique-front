import { CanDeactivateFn } from '@angular/router';
import { DemandeAccesComponent } from '../../pages/auth/demande-acces/demande-acces.component';

export const pendingFormGuard: CanDeactivateFn<DemandeAccesComponent> = (component) => {
  if (!component || typeof component.canDeactivate !== 'function') return true;
  return component.canDeactivate();
};