import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { ICAL_SOURCES } from '@/lib/config/ical-sources';
import type { RoomSyncResult } from '@/lib/domain/reservations/sync-from-ical';
import { syncReservationsFromIcalSources } from '@/lib/domain/reservations/sync-from-ical';
import { enqueueIcalJob } from '@/lib/sync/jobs/ical-to-db';

const SYNC_REQUIRES_SR =
  'SUPABASE_SERVICE_ROLE_KEY is required for unattended iCal sync (cron or worker without a browser session).';

/**
 * Ingests reservations from configured iCal URLs (Beds24 / PMS).
 * Uses service role when available so cron and workers bypass RLS without a user session.
 */
export async function runIcalSync(): Promise<Record<string, RoomSyncResult>> {
  const sr = getServiceRoleClient();
  if (sr) {
    return syncReservationsFromIcalSources(sr, ICAL_SOURCES);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Object.fromEntries(
      ICAL_SOURCES.map((s) => [s.room, { upserted: 0, errors: [SYNC_REQUIRES_SR] }])
    );
  }

  return syncReservationsFromIcalSources(supabase, ICAL_SOURCES);
}

/** Optional: enqueue a durable job (see sync_jobs) instead of inline. */
export async function enqueueIcalSyncJob() {
  return enqueueIcalJob();
}
