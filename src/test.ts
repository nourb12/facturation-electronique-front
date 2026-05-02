import 'zone.js/testing';
import { TestBed, TestModuleMetadata, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { TranslateModule, provideTranslateService } from '@ngx-translate/core';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const configureTestingModule = TestBed.configureTestingModule.bind(TestBed);

TestBed.configureTestingModule = (moduleDef: TestModuleMetadata) =>
  configureTestingModule({
    ...moduleDef,
    imports: [
      ...(moduleDef?.imports ?? []),
      TranslateModule.forRoot({
        fallbackLang: 'fr',
        lang: 'fr',
      }),
    ],
    providers: [
      ...(moduleDef?.providers ?? []),
      ...provideTranslateService({
        fallbackLang: 'fr',
        lang: 'fr',
      }),
    ],
  });
