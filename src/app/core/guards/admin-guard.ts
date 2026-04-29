import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (environment.demoMode) {
    return true;
  }

  if (!auth.token) {
    return router.createUrlTree(['/admin/login']);
  }

  const expiresAt = localStorage.getItem('ey_expires_at');
  if (expiresAt && new Date(expiresAt) < new Date()) {
    auth.clearSession();
    return router.createUrlTree(['/admin/login']);
  }

  if (auth.role !== 'SuperAdmin') {
    return router.createUrlTree(['/admin/login']);
  }

  return true;
};
