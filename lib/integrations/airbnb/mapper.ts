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

export function mapAirbnbToReservation(
  raw: unknown
): (CreateReservationInput & { guestName?: string }) | null {
  if (typeof raw !== 'object' || !raw) return null;
  const res = extractReservation(raw as Record<string, unknown>);

  const externalId = String(res.confirmation_code ?? res.id ?? '');
  const checkIn = String(res.check_in_date ?? res.check_in ?? '');
  const checkOut = String(res.check_out_date ?? res.check_out ?? '');
  if (!checkIn || !checkOut) return null;

  const listing = typeof res.listing === 'object' && res.listing ? (res.listing as Record<string, unknown>) : null;
  const room = String(listing?.nickname ?? listing?.name ?? 'Quarto 1');

  const guest = typeof res.guest === 'object' && res.guest ? (res.guest as Record<string, unknown>) : {};
  const guestName = [guest.first_name, guest.last_name].filter(Boolean).join(' ') || undefined;

  return { externalId, checkIn, checkOut, room, channel: 'airbnb', status: 'confirmed', guestId: null, guestName };
}
