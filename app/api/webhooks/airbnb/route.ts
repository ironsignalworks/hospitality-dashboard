import { parseAirbnbEvent, verifyAirbnbWebhook } from '@/lib/integrations/airbnb/webhooks';
import { mapAirbnbToReservation } from '@/lib/integrations/airbnb/mapper';
import { syncQueue } from '@/lib/sync/queue';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyAirbnbWebhook(raw, request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = raw ? (JSON.parse(raw) as unknown) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ev = parseAirbnbEvent(body);

  if (ev.type === 'reservation.created' || ev.type === 'reservation.updated') {
    const mapped = mapAirbnbToReservation(ev.payload);
    if (mapped) {
      await syncQueue.enqueue('reservation_created', mapped as Record<string, unknown>);
    }
  } else if (ev.type === 'reservation.cancelled') {
    const mapped = mapAirbnbToReservation(ev.payload);
    if (mapped) {
      await syncQueue.enqueue('reservation_created', {
        ...mapped as Record<string, unknown>,
        status: 'cancelled',
      });
    }
  }

  return NextResponse.json({ received: true, type: ev.type });
}
