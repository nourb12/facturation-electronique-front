import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const financierGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (environment.demoMode) {
    return true;
  }

  if (!auth.token) {
    return router.createUrlTree(['/login/financier']);
  }

  const role = auth.role;
  const rolesAutorises = ['Admin', 'ResponsableEntreprise', 'ResponsableFinancier'];

  if (!rolesAutorises.includes(role)) {
    return router.createUrlTree(['/login/financier']);
  }

  return true;
};
