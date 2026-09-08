import { DEFAULT_ROOM } from '@/lib/config/rooms';
import { detectConflict } from '@/lib/domain/conflicts';
import { mockStorage } from '@/lib/mock-storage';
import { createDemoReservation } from '@/lib/services/demo-reservation-service';
import { demoError, demoJson, guardDemoApi } from '@/lib/demo-http';
import { simulateWebhookBodySchema } from '@/lib/schemas/webhooks';
import { readDemoSchema } from '@/lib/schemas/parse';

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readDemoSchema(request, simulateWebhookBodySchema);
  if (body instanceof Response) return body;

  const { action, data } = body;
  const room = data.room ?? DEFAULT_ROOM;
  const check_in = data.check_in;
  const check_out = data.check_out;
  const conflicts = detectConflict({ room, check_in, check_out }, mockStorage.getReservations());
  if (conflicts.length > 0) {
    return demoError(request, 'Double booking conflict detected', 'CONFLICT', 409, {
      status: 'conflict',
      conflicting_reservations: conflicts,
    });
  }
  const result = createDemoReservation({
    guest_name: data.guest_name ?? 'Channel guest',
    guest_email: data.guest_email ?? null,
    room,
    check_in,
    check_out,
    channel: action === 'booking_com' ? 'booking' : 'airbnb',
    status: 'confirmed',
    total_eur: data.total_eur ?? null,
    external_id: data.external_id ?? null,
  });
  if (result.error || !result.reservation) {
    return demoError(request, result.error ?? 'Could not create', 'VALIDATION_ERROR', 400);
  }
  return demoJson(request, { ok: true, status: 'created', data: result.reservation });
}
