import { getServiceRoleClient } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';

export type JobType =
  | 'push_availability'
  | 'push_pricing'
  | 'ical_sync'
  | 'ical_to_db'
  | 'reservation_created';

const MAX_ATTEMPTS = 3;

/**
 * Durable job queue: table `sync_jobs` when `SUPABASE_SERVICE_ROLE_KEY` is set;
 * otherwise a lightweight in-memory id (local dev, no service key).
 */
export const syncQueue = {
  async enqueue(
    type: JobType,
    payload: Record<string, unknown> = {}
  ): Promise<{ id: string; durable: boolean }> {
    const supabase: SupabaseClient | null = getServiceRoleClient();
    if (!supabase) {
      return { id: `mem-${type}-${Date.now()}`, durable: false };
    }
    const { data, error } = await supabase
      .from('sync_jobs')
      .insert({
        type,
        payload,
        status: 'pending',
        attempts: 0,
        max_attempts: MAX_ATTEMPTS,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[syncQueue] insert failed, using in-memory id', error.message);
      return { id: `mem-err-${Date.now()}`, durable: false };
    }
    return { id: (data as { id: string }).id, durable: true };
  },
};
