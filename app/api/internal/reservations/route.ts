import type { CreateReservationInput } from '@/lib/domain/reservations/create';
import { isAuthorizedInternalRequest } from '@/lib/internal-api';
import { createReservation } from '@/lib/services/reservation-service';
import { NextResponse } from 'next/server';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === 'string' ? v : null;
}

/**
 * Server-to-server reservation actions. Thin wrapper over `reservation-service` / domain.
 */
export async function POST(request: Request) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const checkIn = str(body.checkIn);
  const checkOut = str(body.checkOut);
  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: 'checkIn and checkOut (ISO) are required' }, { status: 400 });
  }

  const input: CreateReservationInput = {
    guestId: strOrNull(body.guestId),
    guestName: str(body.guestName),
    room: str(body.room) ?? 'Quarto 1',
    checkIn,
    checkOut,
    channel: str(body.channel) ?? 'direct',
    status: str(body.status) ?? 'confirmed',
    externalId: str(body.externalId),
  };

  const result = await createReservation(input);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 501 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
