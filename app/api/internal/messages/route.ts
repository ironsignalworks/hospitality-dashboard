import { isAuthorizedInternalRequest } from '@/lib/internal-api';
import {
  saveGuestMessageAndGenerateDraft,
  setMessageHandled,
} from '@/lib/services/messaging-service';
import { NextResponse } from 'next/server';

/**
 * Same contract as `POST/ PATCH /api/messages`, but for workers / internal services (Bearer
 * `INTERNAL_API_SECRET` when set).
 */
export async function POST(request: Request) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

export async function PATCH(request: Request) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let id: string, handled: boolean | undefined;
  try {
    ({ id, handled } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const r = await setMessageHandled(id, Boolean(handled));
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
