import {
  saveGuestMessageAndGenerateDraft,
  setMessageHandled,
} from '@/lib/services/messaging-service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/demo';
import { mockStorage } from '@/lib/mock-storage';
import { guardDemoApi, readJsonObject } from '@/lib/demo-http';
import type { MessageRole } from '@/lib/types';

export async function GET(request: Request) {
  if (IS_DEMO) {
    const blocked = await guardDemoApi(request);
    if (blocked) return blocked;
    const { searchParams } = new URL(request.url);
    const messages = mockStorage.getMessages({
      reservation_id: searchParams.get('reservation_id') ?? undefined,
      guest_id: searchParams.get('guest_id') ?? undefined,
    });
    return NextResponse.json({ data: messages });
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
    const body = await readJsonObject(request);
    if (body instanceof NextResponse) return body;

    const guestMessage = typeof body.guestMessage === 'string' ? body.guestMessage.trim() : '';
    const ownerBody = typeof body.body === 'string' ? body.body.trim() : '';
    const reservationId =
      typeof body.reservationId === 'string'
        ? body.reservationId
        : typeof body.reservation_id === 'string'
          ? body.reservation_id
          : null;
    const guestId =
      typeof body.guestId === 'string'
        ? body.guestId
        : typeof body.guest_id === 'string'
          ? body.guest_id
          : null;

    if (guestMessage) {
      const saved = mockStorage.createMessage({
        reservation_id: reservationId,
        guest_id: guestId,
        body: guestMessage,
        role: 'guest',
        handled: false,
        scheduled_at: null,
      });
      const draft = `Thanks for your message — we'll get back to you shortly.`;
      mockStorage.createMessage({
        reservation_id: reservationId,
        guest_id: guestId,
        body: draft,
        role: 'ai',
        handled: false,
        scheduled_at: null,
      });
      return NextResponse.json({ ok: true, messageId: saved.id, aiDraft: draft, data: saved });
    }

    if (!ownerBody) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    const role: MessageRole = body.role === 'ai' || body.role === 'guest' ? body.role : 'owner';
    const scheduled_at = typeof body.scheduled_at === 'string' ? body.scheduled_at : null;
    const saved = mockStorage.createMessage({
      reservation_id: reservationId,
      guest_id: guestId,
      body: ownerBody,
      role,
      handled: role !== 'guest',
      scheduled_at,
    });
    return NextResponse.json({ ok: true, data: saved });
  }

  let guestMessage: string, reservationId: string | undefined, guestId: string | undefined;
  try {
    ({ guestMessage, reservationId, guestId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!guestMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const r = await saveGuestMessageAndGenerateDraft({ guestMessage, reservationId, guestId });
  if (r.error) {
    return NextResponse.json({ error: r.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messageId: r.messageId, aiDraft: r.aiDraft });
}

export async function PATCH(request: Request) {
  if (IS_DEMO) {
    const blocked = await guardDemoApi(request);
    if (blocked) return blocked;
    const body = await readJsonObject(request);
    if (body instanceof NextResponse) return body;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const handled = typeof body.handled === 'boolean' ? body.handled : undefined;
    const updated = mockStorage.updateMessage(id, handled !== undefined ? { handled } : {});
    if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: updated });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let id: string, handled: boolean | undefined;
  try {
    ({ id, handled } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (typeof handled !== 'boolean') {
    return NextResponse.json({ error: 'handled (boolean) is required' }, { status: 400 });
  }

  const r = await setMessageHandled(id, handled);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!IS_DEMO) {
    return NextResponse.json({ error: 'Not in demo mode' }, { status: 403 });
  }
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const ok = mockStorage.deleteMessage(id);
  if (!ok) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
