import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { I18N_JSON_FILES } from './i18n.constants';

type JsonDict = Record<string, any>;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target: JsonDict, source: JsonDict): JsonDict {
  const out: JsonDict = { ...target };
  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    const tgtVal = out[key];
    if (isObject(srcVal) && isObject(tgtVal)) {
      out[key] = deepMerge(tgtVal as JsonDict, srcVal as JsonDict);
    } else {
      out[key] = srcVal;
    }
  });
  return out;
}

@Injectable({ providedIn: 'root' })
export class MultiJsonTranslateHttpLoader implements TranslateLoader {
  // Load translation files through the raw backend so app interceptors
  // never interfere with static /assets/i18n/*.json requests.
  private readonly http = new HttpClient(inject(HttpBackend));

  getTranslation(lang: string): Observable<JsonDict> {
    // Use an absolute app-root path so nested routes like /admin/login do not
    // request /admin/assets/... and fall back to raw translation keys.
    const requests = I18N_JSON_FILES.map((file) => {
      const path = `/assets/i18n/${lang}/${file}.json`;
      return this.http.get<JsonDict>(path).pipe(
        // Missing file should not crash the app in prod; we fallback to default lang.
        catchError(() => of({}))
      );
    });

    return forkJoin(requests).pipe(
      map((parts) => parts.reduce((acc, cur) => deepMerge(acc, cur), {} as JsonDict))
    );
  }
}
