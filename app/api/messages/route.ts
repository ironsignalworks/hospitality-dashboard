import {
  saveGuestMessageAndGenerateDraft,
  setMessageHandled,
} from '@/lib/services/messaging-service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/demo';
import { mockStorage } from '@/lib/mock-storage';
import { demoError, demoJson, guardDemoApi } from '@/lib/demo-http';
import { idQuerySchema } from '@/lib/schemas/primitives';
import {
  messageListQuerySchema,
  patchMessageBodySchema,
  patchMessageProdBodySchema,
  postGuestMessageProdSchema,
  postMessageBodySchema,
} from '@/lib/schemas/message';
import {
  parseSchema,
  parseSearchParams,
  readDemoSchema,
  validationJson,
} from '@/lib/schemas/parse';

export async function GET(request: Request) {
  if (IS_DEMO) {
    const blocked = await guardDemoApi(request);
    if (blocked) return blocked;
    const query = parseSearchParams(request, messageListQuerySchema, new URL(request.url).searchParams);
    if (query instanceof Response) return query;
    const messages = mockStorage.getMessages({
      reservation_id: query.reservation_id,
      guest_id: query.guest_id,
    });
    return demoJson(request, { data: messages }, { cache: true });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('messages')
    .select('*, guest:guests(id,name), reservation:reservations(room,check_in,check_out)')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  if (IS_DEMO) {
    const blocked = await guardDemoApi(request);
    if (blocked) return blocked;
    const body = await readDemoSchema(request, postMessageBodySchema);
    if (body instanceof Response) return body;

    if (body.guestMessage) {
      const saved = mockStorage.createMessage({
        reservation_id: body.reservation_id,
        guest_id: body.guest_id,
        body: body.guestMessage,
        role: 'guest',
        handled: false,
        scheduled_at: null,
      });
      const draft = `Thanks for your message — we'll get back to you shortly.`;
      mockStorage.createMessage({
        reservation_id: body.reservation_id,
        guest_id: body.guest_id,
        body: draft,
        role: 'ai',
        handled: false,
        scheduled_at: null,
      });
      return demoJson(request, { ok: true, messageId: saved.id, aiDraft: draft, data: saved });
    }

    const saved = mockStorage.createMessage({
      reservation_id: body.reservation_id,
      guest_id: body.guest_id,
      body: body.body,
      role: body.role ?? 'owner',
      handled: (body.role ?? 'owner') !== 'guest',
      scheduled_at: body.scheduled_at,
    });
    return demoJson(request, { ok: true, data: saved });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = parseSchema(postGuestMessageProdSchema, raw);
  if (!parsed.success) return validationJson(parsed.issues);

  const r = await saveGuestMessageAndGenerateDraft({
    guestMessage: parsed.data.guestMessage,
    reservationId: parsed.data.reservationId,
    guestId: parsed.data.guestId,
  });
  if (r.error) {
    return NextResponse.json({ error: r.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messageId: r.messageId, aiDraft: r.aiDraft });
}

export async function PATCH(request: Request) {
  if (IS_DEMO) {
    const blocked = await guardDemoApi(request);
    if (blocked) return blocked;
    const body = await readDemoSchema(request, patchMessageBodySchema);
    if (body instanceof Response) return body;
    const updated = mockStorage.updateMessage(
      body.id,
      body.handled !== undefined ? { handled: body.handled } : {}
    );
    if (!updated) return demoError(request, 'Message not found', 'NOT_FOUND', 404);
    return demoJson(request, { ok: true, data: updated });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = parseSchema(patchMessageProdBodySchema, raw);
  if (!parsed.success) return validationJson(parsed.issues);

  const r = await setMessageHandled(parsed.data.id, parsed.data.handled);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!IS_DEMO) {
    return NextResponse.json({ error: 'Not in demo mode' }, { status: 403 });
  }
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;
  const parsed = parseSearchParams(request, idQuerySchema, new URL(request.url).searchParams);
  if (parsed instanceof Response) return parsed;
  const ok = mockStorage.deleteMessage(parsed.id);
  if (!ok) return demoError(request, 'Message not found', 'NOT_FOUND', 404);
  return demoJson(request, { ok: true });
}
