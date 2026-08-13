import { getServiceRoleClient } from '@/lib/supabase/service';
import { runIcalSync } from '@/lib/services/sync-service';
import { createReservation } from '@/lib/services/reservation-service';
import type { CreateReservationInput } from '@/lib/domain/reservations/create';

type JobType =
  | 'push_availability'
  | 'push_pricing'
  | 'ical_sync'
  | 'ical_to_db'
  | 'reservation_created';

export async function processOneSyncJob(): Promise<{
  ok: boolean;
  processed?: boolean;
  id?: string;
  status?: string;
  reason?: string;
  error?: string;
}> {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { ok: true, processed: false, reason: 'no service role' };
  }

  const { data, error } = await supabase
    .from('sync_jobs')
    .select('id, type, payload, attempts, max_attempts, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ok: true, processed: false, reason: error?.message };
  }

  const row = data as {
    id: string;
    type: JobType;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
  };

  const nextAttempt = (row.attempts ?? 0) + 1;
  const maxAttempts = row.max_attempts ?? 3;
  if (nextAttempt > maxAttempts) {
    await supabase.from('sync_jobs').update({ status: 'failed' }).eq('id', row.id);
    return { ok: true, id: row.id, status: 'failed_max' };
  }

  await supabase
    .from('sync_jobs')
    .update({ status: 'running', attempts: nextAttempt })
    .eq('id', row.id);

  try {
    switch (row.type) {
      case 'ical_to_db':
      case 'ical_sync':
        await runIcalSync();
        break;

      case 'reservation_created': {
        const input = row.payload as CreateReservationInput & { guestName?: string };
        if (!input.checkIn || !input.checkOut || !input.channel) {
          throw new Error('reservation_created job missing required fields');
        }
        const result = await createReservation(input);
        if (result.error) throw new Error(result.error);
        break;
      }

      case 'push_availability':
      case 'push_pricing':
        // Outbound channel push: Airbnb/Booking API clients are not yet wired.
        // Until then, re-sync iCal so our DB reflects the latest state from the channels.
        await runIcalSync();
        break;

      default:
        break;
    }

    await supabase.from('sync_jobs').update({ status: 'done' }).eq('id', row.id);
    return { ok: true, id: row.id, status: 'done', processed: true };
  } catch (e) {
    const msg = String(e);
    await supabase
      .from('sync_jobs')
      .update({ status: 'pending', last_error: msg })
      .eq('id', row.id);
    return { ok: false, id: row.id, error: msg, processed: true };
  }
}
