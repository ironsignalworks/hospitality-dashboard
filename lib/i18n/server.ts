import { cookies } from 'next/headers';
import { LOCALE_COOKIE, parseLocale, type Locale } from './locale';
import { createT, type TFunction } from './translate';
import { messagesFor } from './messages';

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getServerT(): Promise<{ locale: Locale; t: TFunction }> {
  const locale = await getServerLocale();
  return { locale, t: createT(messagesFor(locale)) };
}
