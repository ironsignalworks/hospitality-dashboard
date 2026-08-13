'use client';
import { useEffect, useState } from 'react';
import { IS_DEMO } from '@/lib/demo';
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/services/settings-service';

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (IS_DEMO) return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: AppSettings) => setSettings(data))
      .catch(() => {});
  }, []);

  return settings;
}
