import type { CreateReservationInput } from '@/lib/domain/reservations/create';

function extractReservation(body: Record<string, unknown>): Record<string, unknown> {
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (data.reservation && typeof data.reservation === 'object') {
      return data.reservation as Record<string, unknown>;
    }
  }
  if (body.reservation && typeof body.reservation === 'object') {
    return body.reservation as Record<string, unknown>;
  }
  return body;
}

export function mapBookingToReservation(
  raw: unknown
): (CreateReservationInput & { guestName?: string }) | null {
  if (typeof raw !== 'object' || !raw) return null;
  const res = extractReservation(raw as Record<string, unknown>);

  const externalId = String(res.booking_id ?? res.id ?? res.reservation_id ?? '');
  const checkIn = String(res.arrival ?? res.check_in_date ?? res.check_in ?? '');
  const checkOut = String(res.departure ?? res.check_out_date ?? res.check_out ?? '');
  if (!checkIn || !checkOut) return null;

  const roomObj = typeof res.room === 'object' && res.room ? (res.room as Record<string, unknown>) : null;
  const room = String(roomObj?.name ?? res.room_name ?? 'Quarto 1');

  const booker = typeof res.booker === 'object' && res.booker
    ? (res.booker as Record<string, unknown>)
    : typeof res.customer === 'object' && res.customer
      ? (res.customer as Record<string, unknown>)
      : typeof res.guest === 'object' && res.guest
        ? (res.guest as Record<string, unknown>)
        : {};
  const guestName =
    typeof booker.name === 'string'
      ? booker.name
      : [booker.first_name, booker.last_name].filter(Boolean).join(' ') || undefined;

  return { externalId, checkIn, checkOut, room, channel: 'booking', status: 'confirmed', guestId: null, guestName };
}
