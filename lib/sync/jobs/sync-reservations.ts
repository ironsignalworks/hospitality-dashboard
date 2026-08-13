import { syncQueue } from '../queue';

export function enqueueChannelReservationSync(channels: string[] = ['airbnb', 'booking', 'ical']) {
  return syncQueue.enqueue('ical_sync', { channels, note: 'umbrella placeholder' });
}
