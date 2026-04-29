import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (environment.production && environment.demoMode) {
  throw new Error('demoMode ne doit jamais etre active en production.');
}

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
