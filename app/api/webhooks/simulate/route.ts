import { NextResponse } from 'next/server';
import { mockStorage } from '@/lib/mock-storage';
import { detectConflict } from '@/lib/domain/conflicts';
import { createDemoReservation } from '@/lib/services/demo-reservation-service';
import { guardDemoApi, readJsonObject, stripDate } from '@/lib/demo-http';

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof NextResponse) return body;

  const action = typeof body.action === 'string' ? body.action : '';
  const data =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};

  if (action === 'airbnb_booking' || action === 'booking_com') {
    const room = typeof data.room === 'string' ? data.room : 'Quarto 1';
    const check_in = stripDate(data.check_in);
    const check_out = stripDate(data.check_out);
    const conflicts = detectConflict({ room, check_in, check_out }, mockStorage.getReservations());
    if (conflicts.length > 0) {
      return NextResponse.json({
        status: 'conflict',
        conflicting_reservations: conflicts,
      });
    }
    const result = createDemoReservation({
      guest_name: typeof data.guest_name === 'string' ? data.guest_name : 'Channel guest',
      guest_email: typeof data.guest_email === 'string' ? data.guest_email : null,
      room,
      check_in,
      check_out,
      channel: action === 'booking_com' ? 'booking' : 'airbnb',
      status: 'confirmed',
      total_eur: typeof data.total_eur === 'number' ? data.total_eur : null,
      external_id: typeof data.external_id === 'string' ? data.external_id : null,
    });
    if (result.error || !result.reservation) {
      return NextResponse.json({ error: result.error ?? 'Could not create' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: 'created', data: result.reservation });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
