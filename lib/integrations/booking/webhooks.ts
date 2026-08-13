import { pickHeader, verifyWebhookHmacSha256 } from '@/lib/integrations/webhook-hmac';
import { isProductionDeploy } from '@/lib/internal-api';

export type BookingEventType =
  | 'reservation.created'
  | 'reservation.updated'
  | 'reservation.cancelled'
  | 'unknown';

export function verifyBookingWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.WEBHOOK_SECRET_BOOKING?.trim();
  if (!secret) {
    return !isProductionDeploy();
  }
  const sig = pickHeader(headers, [
    'x-booking-signature',
    'x-booking-hmac-sha256',
    'x-booking-sha256-signature',
    'booking-signature',
    'x-signature',
  ]);
  return verifyWebhookHmacSha256(rawBody, secret, sig);
}

export function parseBookingEvent(body: unknown): { type: BookingEventType; payload: unknown } {
  if (typeof body !== 'object' || !body) return { type: 'unknown', payload: body };
  const raw = body as Record<string, unknown>;
  const t = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
  const event = typeof raw.event === 'string' ? raw.event.toLowerCase() : '';
  const key = t || event;

  if (key.includes('cancel')) return { type: 'reservation.cancelled', payload: raw };
  if (key.includes('modif') || key.includes('update') || key.includes('change')) {
    return { type: 'reservation.updated', payload: raw };
  }
  if (key.includes('new') || key.includes('creat') || key.includes('book')) {
    return { type: 'reservation.created', payload: raw };
  }
  return { type: 'unknown', payload: body };
}
