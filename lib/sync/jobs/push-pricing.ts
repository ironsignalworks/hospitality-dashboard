import { syncQueue } from '../queue';

export function enqueuePushPricing() {
  return syncQueue.enqueue('push_pricing', { requestedAt: new Date().toISOString() });
}
