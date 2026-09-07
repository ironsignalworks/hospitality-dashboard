import type { Locale } from './i18n/locale';
import { localeToBcp47 } from './i18n/locale';

export function formatDate(
  dateStr: string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(
    localeToBcp47(locale),
    options ?? { weekday: 'short', day: 'numeric', month: 'short' }
  );
}

export function formatDateTime(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(localeToBcp47(locale), {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatMonthYear(date: Date, locale: Locale) {
  return date.toLocaleDateString(localeToBcp47(locale), { month: 'long', year: 'numeric' });
}

export function formatWeekdayShort(dateStr: string, locale: Locale) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(localeToBcp47(locale), {
    weekday: 'short',
  });
}

export function weekdayHeaders(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(localeToBcp47(locale), { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

export function stripTZ(dateStr: string) {
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
}
