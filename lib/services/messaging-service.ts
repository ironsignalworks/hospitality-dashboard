import { createClient } from '@/lib/supabase/server';
import { draftReply } from '@/lib/openai';

export async function saveGuestMessageAndGenerateDraft(input: {
  guestMessage: string;
  reservationId?: string | null;
  guestId?: string | null;
}) {
  const { guestMessage, reservationId, guestId } = input;
  const supabase = await createClient();

  const { data: savedMsg, error: saveError } = await supabase
    .from('messages')
    .insert({
      reservation_id: reservationId ?? null,
      guest_id: guestId ?? null,
      body: guestMessage,
      role: 'guest',
      handled: false,
    })
    .select()
    .single();

  if (saveError) {
    return { error: saveError.message as string };
  }

  const { data: contentRows } = await supabase.from('concierge_content').select('key, value');
  const context: Record<string, string> = {};
  for (const row of contentRows ?? []) {
    context[row.key] = row.value;
  }

  let aiDraft: string | null = null;
  try {
    aiDraft = await draftReply(guestMessage, context);
    await supabase.from('messages').insert({
      reservation_id: reservationId ?? null,
      guest_id: guestId ?? null,
      body: aiDraft,
      role: 'ai',
      handled: false,
    });
  } catch {
    // AI unavailable
  }

  return { error: null as null, messageId: savedMsg.id, aiDraft };
}

export async function setMessageHandled(id: string, handled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('messages').update({ handled }).eq('id', id);
  if (error) return { error: error.message };
  return { error: null as null };
}
