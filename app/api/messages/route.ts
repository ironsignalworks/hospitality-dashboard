import {
  saveGuestMessageAndGenerateDraft,
  setMessageHandled,
} from '@/lib/services/messaging-service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/messages — receive a guest message and return an AI draft
export async function POST(request: Request) {
  let guestMessage: string, reservationId: string | undefined, guestId: string | undefined;
  try {
    ({ guestMessage, reservationId, guestId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!guestMessage) {
    return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
  }

  const r = await saveGuestMessageAndGenerateDraft({ guestMessage, reservationId, guestId });
  if (r.error) {
    return NextResponse.json({ error: r.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messageId: r.messageId, aiDraft: r.aiDraft });
}

// PATCH /api/messages — mark a message as handled (owner only)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let id: string, handled: boolean | undefined;
  try {
    ({ id, handled } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  if (typeof handled !== 'boolean') {
    return NextResponse.json({ error: 'handled (boolean) é obrigatório' }, { status: 400 });
  }

  const r = await setMessageHandled(id, handled);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
