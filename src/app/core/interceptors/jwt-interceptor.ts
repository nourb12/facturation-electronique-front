import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { environment } from '../../../environments/environment';

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/mot-de-passe-oublie',
  '/auth/verifier-otp',
  '/auth/reinitialiser-mot-de-passe',
  '/auth/2fa/login',
];

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const refreshSvc = inject(TokenRefreshService);

  if (environment.demoMode) {
    return next(req);
  }

  const apiBase = environment.apiUrl.replace(/\/+$/, '');
  const isApi = req.url.startsWith(apiBase);
  if (!isApi) {
    return next(req);
  }

  const isPublic = PUBLIC_ROUTES.some(route => req.url.includes(route));
  const token = auth.token;

  const authReq = token && !isPublic
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublic) {
        if (!refreshSvc.isRefreshing) {
          refreshSvc.startRefresh();

          return auth.refreshTokens().pipe(
            switchMap(() => {
              refreshSvc.endRefresh(true);
              const newToken = auth.token;
              const retryReq = newToken
                ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${newToken}`) })
                : req;
              return next(retryReq);
            }),
            catchError(refreshErr => {
              refreshSvc.endRefresh(false);
              auth.clearSession();
              router.navigate(['/login/entreprise']);
              return throwError(() => refreshErr);
            })
          );
        }

        return refreshSvc.refreshDone$.pipe(
          filter(done => done === true),
          take(1),
          switchMap(() => {
            const newToken = auth.token;
            const retryReq = newToken
              ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${newToken}`) })
              : req;
            return next(retryReq);
          })
        );
      }

      if (err.status === 403) {
        auth.clearSession();
        router.navigate(['/login/entreprise']);
        return throwError(() => err);
      }

      return throwError(() => err);
    })
  );
};
