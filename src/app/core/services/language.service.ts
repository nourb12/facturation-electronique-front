import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppLang, DEFAULT_LANG, I18N_STORAGE_KEY, SUPPORTED_LANGS } from '../i18n/i18n.constants';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  // null = not yet loaded (forces first load even if lang matches DEFAULT_LANG)
  private loaded = false;
  readonly current = signal<AppLang>(DEFAULT_LANG);

  async init(): Promise<void> {
    this.translate.addLangs([...SUPPORTED_LANGS]);

    // Load fallback translations early to guarantee a readable UI even if a key is missing.
    await firstValueFrom(this.translate.setFallbackLang(DEFAULT_LANG));

    const initial = this.resolveInitialLang();
    await this.use(initial);

    // Keep HTML attributes in sync even if another part of the app changes lang.
    this.translate.onLangChange.subscribe((e) => {
      const lang = this.sanitizeLang(e.lang);
      this.current.set(lang);
      this.applyDocumentLang(lang);
    });
  }

  async switchLang(lang: AppLang): Promise<void> {
    await this.use(lang);
  }

  private async use(lang: AppLang): Promise<void> {
    const next = this.sanitizeLang(lang);

    // Skip only if already loaded AND same language
    if (this.loaded && next === this.current()) {
      this.persist(next);
      this.applyDocumentLang(next);
      return;
    }

    this.persist(next);
    await firstValueFrom(this.translate.use(next));
    this.loaded = true;
    this.current.set(next);
    this.applyDocumentLang(next);
  }

  private resolveInitialLang(): AppLang {
    const stored = this.readStoredLang();
    if (stored) return stored;

    const browser = this.detectBrowserLang();
    if (browser) return browser;

    return DEFAULT_LANG;
  }

  private detectBrowserLang(): AppLang | null {
    const raw = (navigator?.language || '').toLowerCase();
    if (!raw) return null;
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('en')) return 'en';
    if (raw.startsWith('fr')) return 'fr';
    return null;
  }

  private sanitizeLang(value: string): AppLang {
    const v = (value || '').toLowerCase();
    if (v === 'ar') return 'ar';
    if (v === 'en') return 'en';
    return 'fr';
  }

  private readStoredLang(): AppLang | null {
    try {
      const value = localStorage.getItem(I18N_STORAGE_KEY);
      return value ? this.sanitizeLang(value) : null;
    } catch {
      return null;
    }
  }

  private persist(lang: AppLang): void {
    try {
      localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  private applyDocumentLang(lang: AppLang): void {
    const root = this.document.documentElement;

    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}

