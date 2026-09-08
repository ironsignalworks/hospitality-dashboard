import { NextResponse } from 'next/server';
import { parseBookingEvent, verifyBookingWebhook } from '@/lib/integrations/booking/webhooks';
import { mapBookingToReservation } from '@/lib/integrations/booking/mapper';
import { syncQueue } from '@/lib/sync/queue';
import {
  unwrapWebhookReservation,
  webhookEnvelopeSchema,
  webhookStaySchema,
} from '@/lib/schemas/webhooks';
import { parseSchema, validationJson } from '@/lib/schemas/parse';

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyBookingWebhook(raw, request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = raw ? (JSON.parse(raw) as unknown) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  const envelope = parseSchema(webhookEnvelopeSchema, body);
  if (!envelope.success) return validationJson(envelope.issues);

  const ev = parseBookingEvent(envelope.data);

  if (ev.type !== 'unknown') {
    const stay = parseSchema(webhookStaySchema, unwrapWebhookReservation(envelope.data));
    if (!stay.success) return validationJson(stay.issues);
  }

  if (ev.type === 'reservation.created' || ev.type === 'reservation.updated') {
    const mapped = mapBookingToReservation(ev.payload);
    if (mapped) {
      await syncQueue.enqueue('reservation_created', mapped as Record<string, unknown>);
    }
  } else if (ev.type === 'reservation.cancelled') {
    const mapped = mapBookingToReservation(ev.payload);
    if (mapped) {
      await syncQueue.enqueue('reservation_created', {
        ...mapped as Record<string, unknown>,
        status: 'cancelled',
      });
    }
  }

  return NextResponse.json({ received: true, type: ev.type });
}
