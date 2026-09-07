import { NextResponse } from 'next/server';
import { mockStorage } from '@/lib/mock-storage';
import { guardDemoApi, readJsonObject } from '@/lib/demo-http';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    const guest = mockStorage.getGuest(id);
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    return NextResponse.json({ data: guest });
  }
  const guests = mockStorage.getGuests(searchParams.get('search') ?? undefined);
  return NextResponse.json({ data: guests });
}

export async function POST(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof NextResponse) return body;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const guest = mockStorage.createGuest({
    name,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    nationality: typeof body.nationality === 'string' ? body.nationality.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes : '',
  });
  return NextResponse.json({ ok: true, data: guest }, { status: 201 });
}

export async function PATCH(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const body = await readJsonObject(request);
  if (body instanceof NextResponse) return body;

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

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
  if (!updated) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: updated });
}
