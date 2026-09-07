export const LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'hd_locale';
export const LOCALE_STORAGE_KEY = 'hd_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLocale(raw: string | null | undefined): Locale {
  return raw === 'pt' ? 'pt' : 'en';
}

export function localeToHtmlLang(locale: Locale): string {
  return locale === 'pt' ? 'pt' : 'en';
}

export function localeToBcp47(locale: Locale): string {
  return locale === 'pt' ? 'pt-PT' : 'en-GB';
}

export function localeCookieHeader(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
