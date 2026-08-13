import { pickHeader, verifyWebhookHmacSha256 } from '@/lib/integrations/webhook-hmac';
import { isProductionDeploy } from '@/lib/internal-api';

export type AirbnbEventType =
  | 'reservation.created'
  | 'reservation.updated'
  | 'reservation.cancelled'
  | 'unknown';

export function verifyAirbnbWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.WEBHOOK_SECRET_AIRBNB?.trim();
  if (!secret) {
    return !isProductionDeploy();
  }
  const sig = pickHeader(headers, [
    'x-airbnb-signature',
    'x-airbnb-sha256-signature',
    'airbnb-signature',
    'x-signature',
  ]);
  return verifyWebhookHmacSha256(rawBody, secret, sig);
}

export function parseAirbnbEvent(body: unknown): { type: AirbnbEventType; payload: unknown } {
  if (typeof body !== 'object' || !body) return { type: 'unknown', payload: body };
  const raw = body as Record<string, unknown>;
  const t = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
  const event = typeof raw.event === 'string' ? raw.event.toLowerCase() : '';
  const key = t || event;

  if (key.includes('cancel')) return { type: 'reservation.cancelled', payload: raw };
  if (key.includes('update') || key.includes('modif')) return { type: 'reservation.updated', payload: raw };
  if (key.includes('creat') || key.includes('new') || key.includes('book')) {
    return { type: 'reservation.created', payload: raw };
  }
  return { type: 'unknown', payload: body };
}
