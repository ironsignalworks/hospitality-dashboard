import { mockStorage } from '@/lib/mock-storage';
import {
  demoError,
  demoJson,
  guardDemoApi,
  jsonNumberOrNull,
  readJsonObject,
  stripDate,
} from '@/lib/demo-http';
import {
  createDemoReservation,
  updateDemoReservation,
} from '@/lib/services/demo-reservation-service';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const reservations = mockStorage.getReservations({
    room: searchParams.get('room') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    guest_id: searchParams.get('guest_id') ?? undefined,
  });
  return demoJson(request, { data: reservations }, { cache: true });
}

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const result = createDemoReservation({
    guest_id: typeof body.guest_id === 'string' ? body.guest_id : null,
    guest_name: typeof body.guest_name === 'string' ? body.guest_name : '',
    guest_email: typeof body.guest_email === 'string' ? body.guest_email : null,
    room: typeof body.room === 'string' && body.room.trim() ? body.room : 'Quarto 1',
    check_in: stripDate(body.check_in),
    check_out: stripDate(body.check_out),
    channel: body.channel,
    status: body.status,
    total_eur: jsonNumberOrNull(body.total_eur),
    external_id: typeof body.external_id === 'string' ? body.external_id : null,
    internal_notes: typeof body.internal_notes === 'string' ? body.internal_notes : null,
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

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return demoError(request, 'id is required', 'VALIDATION_ERROR', 400);

  const result = updateDemoReservation(id, {
    guest_name: typeof body.guest_name === 'string' ? body.guest_name : undefined,
    guest_email: typeof body.guest_email === 'string' ? body.guest_email : undefined,
    room: typeof body.room === 'string' ? body.room : undefined,
    check_in: body.check_in !== undefined ? stripDate(body.check_in) : undefined,
    check_out: body.check_out !== undefined ? stripDate(body.check_out) : undefined,
    channel: body.channel,
    status: body.status,
    total_eur: body.total_eur !== undefined ? jsonNumberOrNull(body.total_eur) : undefined,
    internal_notes:
      body.internal_notes === null
        ? null
        : typeof body.internal_notes === 'string'
          ? body.internal_notes
          : undefined,
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

  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id') ?? '';
  if (!id) {
    const body = await readJsonObject(request);
    if (!(body instanceof Response) && typeof body.id === 'string') id = body.id;
  }
  if (!id) return demoError(request, 'id is required', 'VALIDATION_ERROR', 400);

  const ok = mockStorage.deleteReservation(id);
  if (!ok) return demoError(request, 'Reservation not found', 'NOT_FOUND', 404);
  return demoJson(request, { ok: true });
}
