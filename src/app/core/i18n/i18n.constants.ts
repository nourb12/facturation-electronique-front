export const SUPPORTED_LANGS = ['fr', 'en', 'ar'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: AppLang = 'fr';

// Split translations by functional area (keeps files small and maintainable).
export const I18N_JSON_FILES = [
  'common',
  'legacy',
  'landing',
  'glossary',
  'auth',
  'dashboard',
  'invoice',
  'transactions',
  'errors',
] as const;

export type I18nNamespace = (typeof I18N_JSON_FILES)[number];

export const I18N_STORAGE_KEY = 'ey_lang';
