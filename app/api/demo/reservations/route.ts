import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/demo';
import { createDemoReservation } from '@/lib/services/demo-reservation-service';
import { jsonNumberOrNull, stripDate } from '@/lib/demo-http';

/** @deprecated Prefer POST /api/reservations. Kept so existing demo callers keep working. */
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
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  const result = createDemoReservation({
    guest_name: String(b.guest_name ?? '').trim(),
    guest_email: String(b.guest_email ?? '').trim() || null,
    room: String(b.room ?? 'Quarto 1'),
    check_in: stripDate(b.check_in),
    check_out: stripDate(b.check_out),
    channel: b.channel,
    status: b.status,
    total_eur: jsonNumberOrNull(b.total_eur),
  });

  if (result.conflicts) {
    return NextResponse.json(
      { ok: false, error: result.error, conflicts: result.conflicts },
      { status: 409 }
    );
  }
  if (result.error || !result.guest || !result.reservation) {
    return NextResponse.json({ ok: false, error: result.error ?? 'Could not save.' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    guest: { id: result.guest.id, name: result.guest.name, email: result.guest.email },
    reservation: { id: result.reservation.id },
  });
}
