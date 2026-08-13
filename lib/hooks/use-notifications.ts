'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IS_DEMO } from '@/lib/demo';
import type { GuestAlert } from '@/lib/types';

export function useNotifications() {
  const [alerts, setAlerts] = useState<GuestAlert[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAlerts = useCallback(async () => {
    if (IS_DEMO) return;
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) return;
      const data: GuestAlert[] = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    loadAlerts();
    timerRef.current = setInterval(loadAlerts, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadAlerts]);

  const dismiss = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (IS_DEMO) return;
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const remove = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (IS_DEMO) return;
    await fetch('/api/alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const now = new Date();
  const dueAlerts = alerts.filter((a) => new Date(a.notify_at) <= now && !a.delivered_at);
  const upcomingAlerts = alerts.filter((a) => new Date(a.notify_at) > now);

  return { alerts, dueAlerts, upcomingAlerts, dismiss, remove, refresh: loadAlerts };
}
