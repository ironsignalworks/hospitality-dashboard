'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchApiJson } from '@/lib/api-client';
import type { Guest, Message, Reservation } from '@/lib/types';

function useDemoList<T>(enabled: boolean, url: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    const json = await fetchApiJson<{ data: T[] }>(url);
    setData(json.data);
    setError(null);
  }, [enabled, url]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    refetch()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, refetch]);

  return { data, setData, loading, error, refetch };
}

export function useReservationsApi(enabled: boolean) {
  return useDemoList<Reservation>(enabled, '/api/reservations');
}

export function useGuestsApi(enabled: boolean) {
  return useDemoList<Guest>(enabled, '/api/guests');
}

export function useMessagesApi(enabled: boolean) {
  return useDemoList<Message>(enabled, '/api/messages');
}
