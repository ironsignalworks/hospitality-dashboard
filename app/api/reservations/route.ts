import { mockStorage } from '@/lib/mock-storage';
import { demoError, demoJson, guardDemoApi } from '@/lib/demo-http';
import { idQuerySchema } from '@/lib/schemas/primitives';
import {
  createReservationBodySchema,
  patchReservationBodySchema,
  reservationListQuerySchema,
} from '@/lib/schemas/reservation';
import { parseDemoSchema, parseSearchParams, readDemoSchema } from '@/lib/schemas/parse';
import {
  createDemoReservation,
  updateDemoReservation,
} from '@/lib/services/demo-reservation-service';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const query = parseSearchParams(request, reservationListQuerySchema, searchParams);
  if (query instanceof Response) return query;

  const reservations = mockStorage.getReservations({
    room: query.room,
    status: query.status,
    guest_id: query.guest_id,
  });
  return demoJson(request, { data: reservations }, { cache: true });
}

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readDemoSchema(request, createReservationBodySchema);
  if (body instanceof Response) return body;

  const result = createDemoReservation({
    guest_id: body.guest_id ?? null,
    guest_name: body.guest_name,
    guest_email: body.guest_email ?? null,
    room: body.room,
    check_in: body.check_in,
    check_out: body.check_out,
    channel: body.channel,
    status: body.status,
    total_eur: body.total_eur ?? null,
    external_id: body.external_id ?? null,
    internal_notes: body.internal_notes ?? null,
  });

  if (result.conflicts) {
    return demoError(request, result.error ?? 'Conflict', 'CONFLICT', 409, {
      conflicts: result.conflicts,
    });
  }
  if (result.error || !result.reservation || !result.guest) {
    return demoError(request, result.error ?? 'Could not save.', 'VALIDATION_ERROR', 400);
  }

  return demoJson(
    request,
    {
      ok: true,
      data: result.reservation,
      guest: { id: result.guest.id, name: result.guest.name, email: result.guest.email },
      reservation: { id: result.reservation.id },
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readDemoSchema(request, patchReservationBodySchema);
  if (body instanceof Response) return body;

  const result = updateDemoReservation(body.id, {
    guest_name: body.guest_name,
    guest_email: body.guest_email,
    room: body.room,
    check_in: body.check_in,
    check_out: body.check_out,
    channel: body.channel,
    status: body.status,
    total_eur: body.total_eur,
    internal_notes: body.internal_notes,
  });

  if (result.conflicts) {
    return demoError(request, result.error ?? 'Conflict', 'CONFLICT', 409, {
      conflicts: result.conflicts,
    });
  }
  if (result.error || !result.reservation) {
    const notFound = result.error === 'Reservation not found';
    return demoError(
      request,
      result.error ?? 'Could not save.',
      notFound ? 'NOT_FOUND' : 'VALIDATION_ERROR',
      notFound ? 404 : 400
    );
  }
  return demoJson(request, { ok: true, data: result.reservation });
}

export async function DELETE(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const idParam = new URL(request.url).searchParams.get('id');
  const parsed = idParam
    ? parseDemoSchema(request, idQuerySchema, { id: idParam })
    : await readDemoSchema(request, idQuerySchema);
  if (parsed instanceof Response) return parsed;

  const ok = mockStorage.deleteReservation(parsed.id);
  if (!ok) return demoError(request, 'Reservation not found', 'NOT_FOUND', 404);
  return demoJson(request, { ok: true });
}
