'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  localeCookieHeader,
  localeToHtmlLang,
  type Locale,
} from './locale';
import { createT, type TFunction } from './translate';
import { messagesFor } from './messages';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TFunction;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookieRaw(name: string): string | null {
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function persistLocale(next: Locale) {
  document.cookie = localeCookieHeader(next);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = localeToHtmlLang(next);
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = localeToHtmlLang(locale);
  }, [locale]);

  useEffect(() => {
    const raw = readCookieRaw(LOCALE_COOKIE);
    if (raw === 'en' || raw === 'pt') return;
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored !== 'en' && stored !== 'pt') return;
      if (stored === locale) {
        persistLocale(stored);
        return;
      }
      setLocaleState(stored);
      persistLocale(stored);
      router.refresh();
    } catch {
      /* ignore */
    }
    // Cookie wins when present; localStorage only hydrates a first visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persistLocale(next);
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: createT(messagesFor(locale)) }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const t = createT(messagesFor(DEFAULT_LOCALE));
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t };
  }
  return ctx;
}

export function useT(): TFunction {
  return useLocale().t;
}
