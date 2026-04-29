







import { ApplicationConfig } from '@angular/core';
import { provideRouter }     from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes }            from './app.routes';
import { jwtInterceptor }    from './core/interceptors/jwt-interceptor';
import { provideI18n } from './core/i18n/i18n.providers';
import { demoDataInterceptor } from './core/interceptors/demo-data.interceptor'; // ← FIX
import { i18nErrorInterceptor } from './core/interceptors/i18n-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([demoDataInterceptor, jwtInterceptor, i18nErrorInterceptor])), // ← i18n error mapping
    provideAnimations(),
    provideI18n(),
  ]
};

