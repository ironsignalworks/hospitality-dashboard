'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DEMO_APP_SETTINGS_STORAGE_KEY, readDemoAppSettingsFromStorage } from '@/lib/demo-app-settings';
import type { AppSettings } from '@/lib/services/settings-service';

const Ctx = createContext<AppSettings | null>(null);

export function AppSettingsProvider({
  initial,
  isDemo,
  children,
}: {
  initial: AppSettings;
  isDemo: boolean;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings>(initial);
  const pathname = usePathname();

  const rehydrateFromDemo = useCallback(() => {
    if (!isDemo) return;
    const s = readDemoAppSettingsFromStorage();
    if (s) setSettings(s);
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) rehydrateFromDemo();
  }, [isDemo, rehydrateFromDemo, pathname]);

  useEffect(() => {
    if (!isDemo) setSettings(initial);
  }, [initial, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const onStore = (e: StorageEvent) => {
      if (e.key === DEMO_APP_SETTINGS_STORAGE_KEY && e.newValue) rehydrateFromDemo();
    };
    window.addEventListener('storage', onStore);
    return () => window.removeEventListener('storage', onStore);
  }, [isDemo, rehydrateFromDemo]);

  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

export function useAppSettings() {
  const s = useContext(Ctx);
  if (!s) {
    throw new Error('useAppSettings must be used under AppSettingsProvider');
  }
  return s;
}
