import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';

function translateIfKey(translate: TranslateService, value: unknown): unknown {
  if (typeof value !== 'string') return value;

  // Only translate strings that look like translation keys.
  // Example: ERRORS.EMAIL_REQUIRED
  if (!/^[A-Z0-9_]+(\.[A-Z0-9_]+)+$/.test(value)) return value;

  const translated = translate.instant(value);
  return translated && translated !== value ? translated : value;
}

export const i18nErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      const body = err.error;
      if (!body || typeof body !== 'object') {
        return throwError(() => err);
      }

      const cloned: any = Array.isArray(body) ? [...body] : { ...(body as any) };

      if (typeof cloned.message === 'string') {
        cloned.message = translateIfKey(translate, cloned.message);
      }

      if (Array.isArray(cloned.errors)) {
        cloned.errors = cloned.errors.map((e: unknown) => translateIfKey(translate, e));
      }

      return throwError(
        () =>
          new HttpErrorResponse({
            error: cloned,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          })
      );
    })
  );
};

