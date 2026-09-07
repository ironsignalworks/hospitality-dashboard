import { mockStorage } from '@/lib/mock-storage';
import { demoError, demoJson, guardDemoApi, readJsonObject } from '@/lib/demo-http';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    const guest = mockStorage.getGuest(id);
    if (!guest) return demoError(request, 'Guest not found', 'NOT_FOUND', 404);
    return demoJson(request, { data: guest }, { cache: true });
  }
  const guests = mockStorage.getGuests(searchParams.get('search') ?? undefined);
  return demoJson(request, { data: guests }, { cache: true });
}

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return demoError(request, 'Name is required', 'VALIDATION_ERROR', 400);

  const guest = mockStorage.createGuest({
    name,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    nationality: typeof body.nationality === 'string' ? body.nationality.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes : '',
  });
  return demoJson(request, { ok: true, data: guest }, { status: 201 });
}

export async function PATCH(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return demoError(request, 'id is required', 'VALIDATION_ERROR', 400);

  const updated = mockStorage.updateGuest(id, {
    ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
    ...(body.email !== undefined
      ? { email: typeof body.email === 'string' ? body.email.trim() || null : null }
      : {}),
    ...(body.phone !== undefined
      ? { phone: typeof body.phone === 'string' ? body.phone.trim() || null : null }
      : {}),
    ...(body.nationality !== undefined
      ? { nationality: typeof body.nationality === 'string' ? body.nationality.trim() || null : null }
      : {}),
    ...(body.notes === null
      ? { notes: null }
      : typeof body.notes === 'string'
        ? { notes: body.notes }
        : {}),
  });
  if (!updated) return demoError(request, 'Guest not found', 'NOT_FOUND', 404);
  return demoJson(request, { ok: true, data: updated });
}
