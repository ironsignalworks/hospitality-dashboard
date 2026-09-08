import { mockStorage } from '@/lib/mock-storage';
import { demoError, demoJson, guardDemoApi } from '@/lib/demo-http';
import { createGuestBodySchema, guestListQuerySchema, patchGuestBodySchema } from '@/lib/schemas/guest';
import { parseSearchParams, readDemoSchema } from '@/lib/schemas/parse';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const query = parseSearchParams(request, guestListQuerySchema, new URL(request.url).searchParams);
  if (query instanceof Response) return query;

  if (query.id) {
    const guest = mockStorage.getGuest(query.id);
    if (!guest) return demoError(request, 'Guest not found', 'NOT_FOUND', 404);
    return demoJson(request, { data: guest }, { cache: true });
  }
  const guests = mockStorage.getGuests(query.search);
  return demoJson(request, { data: guests }, { cache: true });
}

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readDemoSchema(request, createGuestBodySchema);
  if (body instanceof Response) return body;

  const guest = mockStorage.createGuest({
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    nationality: body.nationality ?? null,
    notes: body.notes ?? '',
  });
  return demoJson(request, { ok: true, data: guest }, { status: 201 });
}

export async function PATCH(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readDemoSchema(request, patchGuestBodySchema);
  if (body instanceof Response) return body;

  const updated = mockStorage.updateGuest(body.id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.nationality !== undefined ? { nationality: body.nationality } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  });
  if (!updated) return demoError(request, 'Guest not found', 'NOT_FOUND', 404);
  return demoJson(request, { ok: true, data: updated });
}
