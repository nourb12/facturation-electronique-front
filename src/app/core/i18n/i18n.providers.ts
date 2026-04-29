import { APP_INITIALIZER, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';
import {
  TranslateLoader,
  TranslateModule,
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
} from '@ngx-translate/core';
import { DEFAULT_LANG } from './i18n.constants';
import { MultiJsonTranslateHttpLoader } from './multi-json-translate-http-loader';
import { LanguageService } from '../services/language.service';

class KeyMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    return params.key;
  }
}

export function provideI18n() {
  return makeEnvironmentProviders([
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: DEFAULT_LANG,
        loader: {
          provide: TranslateLoader,
          useClass: MultiJsonTranslateHttpLoader,
        },
        missingTranslationHandler: {
          provide: MissingTranslationHandler,
          useClass: KeyMissingTranslationHandler,
        },
      })
    ),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [LanguageService],
      useFactory: (lang: LanguageService) => () => lang.init(),
    },
  ]);
}
