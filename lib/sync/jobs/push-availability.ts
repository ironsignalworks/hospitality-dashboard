import { syncQueue } from '../queue';

export function enqueuePushAvailability() {
  return syncQueue.enqueue('push_availability', { requestedAt: new Date().toISOString() });
}
