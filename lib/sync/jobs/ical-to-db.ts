import { syncQueue } from '../queue';

/** Enqueue iCal full import as a job (for workers); inline sync still used by /api/sync-ical. */
export function enqueueIcalJob() {
  return syncQueue.enqueue('ical_to_db', { source: 'queued' });
}
