import { mockStorage } from '@/lib/mock-storage';
import type { Reservation } from '@/lib/types';

export function getDemoTodaySnapshot(today: string, in7: string): {
  reservations: Reservation[];
  unreadCount: number;
} {
  const reservations = mockStorage
    .getReservations()
    .filter((r) => r.check_in <= in7 && r.check_out >= today && r.status !== 'cancelled');
  const unreadCount = mockStorage
    .getMessages()
    .filter((m) => !m.handled && m.role === 'guest').length;
  return { reservations, unreadCount };
}
