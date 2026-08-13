import { NextResponse } from 'next/server';
import { IS_DEMO, MOCK_GUESTS, MOCK_RESERVATIONS } from '@/lib/demo';
import type { Channel, Guest, Reservation, ReservationStatus } from '@/lib/types';

function stripTZ(d: unknown): string {
  if (typeof d !== 'string') return '';
  return d.split('T')[0] ?? d;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(request: Request) {
  if (!IS_DEMO) {
    return NextResponse.json({ ok: false, error: 'Not in demo mode.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const b = (body && typeof body === 'object' ? (body as Record<string, unknown>) : {}) satisfies Record<
    string,
    unknown
  >;

  const guestName = String(b.guest_name ?? '').trim();
  const guestEmail = String(b.guest_email ?? '').trim() || null;
  const room = String(b.room ?? 'Quarto 1');
  const checkIn = stripTZ(b.check_in);
  const checkOut = stripTZ(b.check_out);

  const channel: Channel =
    b.channel === 'airbnb' || b.channel === 'booking' || b.channel === 'direct' ? b.channel : 'direct';
  const status: ReservationStatus =
    b.status === 'confirmed' ||
    b.status === 'pending' ||
    b.status === 'cancelled' ||
    b.status === 'checked_in' ||
    b.status === 'checked_out'
      ? b.status
      : 'confirmed';

  const totalEurRaw = b.total_eur;
  const totalEur =
    typeof totalEurRaw === 'number'
      ? totalEurRaw
      : typeof totalEurRaw === 'string' && totalEurRaw.trim()
        ? Number.parseFloat(totalEurRaw)
        : null;

  if (!guestName || !checkIn || !checkOut) {
    return NextResponse.json(
      { ok: false, error: 'Nome do hóspede, check-in e check-out são obrigatórios.' },
      { status: 400 }
    );
  }
  if (checkIn >= checkOut) {
    return NextResponse.json(
      { ok: false, error: 'Check-out tem de ser depois do check-in.' },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const guestId = makeId('g-demo');
  const reservationId = makeId('r-demo');

  const guest: Guest = {
    id: guestId,
    name: guestName,
    email: guestEmail,
    phone: null,
    nationality: null,
    notes: '',
    created_at: nowIso,
  };
  MOCK_GUESTS.push(guest);

  const reservation: Reservation = {
    id: reservationId,
    guest_id: guestId,
    room,
    check_in: checkIn,
    check_out: checkOut,
    channel,
    status,
    total_eur: Number.isFinite(totalEur as number) ? totalEur : null,
    external_id: null,
    internal_notes: null,
    created_at: nowIso,
    guest,
  };
  MOCK_RESERVATIONS.push(reservation);

  return NextResponse.json({
    ok: true,
    guest: { id: guestId, name: guestName, email: guestEmail },
    reservation: { id: reservationId },
  });
}
