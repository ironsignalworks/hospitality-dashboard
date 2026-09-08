import { detectConflict } from '@/lib/domain/conflicts';
import { mockStorage, parseChannel, parseStatus } from '@/lib/mock-storage';
import { DEFAULT_ROOM } from '@/lib/config/rooms';
import type { Guest, Reservation } from '@/lib/types';

function roomKeyOrFallback(room: string | undefined, fallback: string): string {
  const key = room?.trim() ?? '';
  return key || fallback;
}

export type DemoReservationInput = {
  guest_id?: string | null;
  guest_name?: string;
  guest_email?: string | null;
  room: string;
  check_in: string;
  check_out: string;
  channel?: unknown;
  status?: unknown;
  total_eur?: number | null;
  external_id?: string | null;
  internal_notes?: string | null;
};

function conflictsFor(candidate: { room: string; check_in: string; check_out: string }, excludeId?: string) {
  const existing = mockStorage.getReservations().filter((r) => r.id !== excludeId);
  return detectConflict(candidate, existing) as Reservation[];
}

export function createDemoReservation(input: DemoReservationInput): {
  reservation?: Reservation;
  guest?: Guest;
  error?: string;
  conflicts?: Reservation[];
} {
  if (!input.guest_name?.trim() || !input.check_in || !input.check_out) {
    return { error: 'Guest name, check-in and check-out are required.' };
  }
  if (input.check_in >= input.check_out) {
    return { error: 'Check-out must be after check-in.' };
  }
  const room = roomKeyOrFallback(input.room, DEFAULT_ROOM);
  const conflicts = conflictsFor({
    room,
    check_in: input.check_in,
    check_out: input.check_out,
  });
  if (conflicts.length > 0) {
    return { error: 'Double booking conflict detected', conflicts };
  }

  let guest: Guest;
  if (input.guest_id) {
    const found = mockStorage.getGuest(input.guest_id);
    guest = found
      ? mockStorage.updateGuest(found.id, {
          name: input.guest_name.trim(),
          email: input.guest_email?.trim() || null,
        }) ?? found
      : mockStorage.createGuest({
          name: input.guest_name.trim(),
          email: input.guest_email?.trim() || null,
          phone: null,
          nationality: null,
          notes: '',
        });
  } else {
    guest = mockStorage.createGuest({
      name: input.guest_name.trim(),
      email: input.guest_email?.trim() || null,
      phone: null,
      nationality: null,
      notes: '',
    });
  }

  const reservation = mockStorage.createReservation({
    guest_id: guest.id,
    room,
    check_in: input.check_in,
    check_out: input.check_out,
    channel: parseChannel(input.channel),
    status: parseStatus(input.status),
    total_eur: input.total_eur ?? null,
    external_id: input.external_id ?? null,
    internal_notes: input.internal_notes ?? null,
  });

  return { reservation, guest: mockStorage.getGuest(guest.id) ?? guest };
}

export function updateDemoReservation(
  id: string,
  input: Partial<DemoReservationInput>
): {
  reservation?: Reservation;
  error?: string;
  conflicts?: Reservation[];
} {
  const existing = mockStorage.getReservation(id);
  if (!existing) return { error: 'Reservation not found' };

  if (input.room !== undefined && !input.room.trim()) {
    return { error: 'Room is required.' };
  }
  const room = roomKeyOrFallback(input.room, existing.room.trim() || DEFAULT_ROOM);
  const check_in = input.check_in ?? existing.check_in;
  const check_out = input.check_out ?? existing.check_out;
  if (check_in >= check_out) {
    return { error: 'Check-out must be after check-in.' };
  }
  const conflicts = conflictsFor({ room, check_in, check_out }, id);
  if (conflicts.length > 0) {
    return { error: 'Double booking conflict detected', conflicts };
  }

  if (existing.guest_id && (input.guest_name || input.guest_email !== undefined)) {
    mockStorage.updateGuest(existing.guest_id, {
      ...(input.guest_name ? { name: input.guest_name.trim() } : {}),
      ...(input.guest_email !== undefined ? { email: input.guest_email?.trim() || null } : {}),
    });
  }

  const reservation = mockStorage.updateReservation(id, {
    room,
    check_in,
    check_out,
    channel: input.channel !== undefined ? parseChannel(input.channel) : existing.channel,
    status: input.status !== undefined ? parseStatus(input.status) : existing.status,
    total_eur: input.total_eur !== undefined ? input.total_eur : existing.total_eur,
    internal_notes:
      input.internal_notes !== undefined ? input.internal_notes : existing.internal_notes,
  });
  return { reservation: reservation ?? undefined };
}
