import type { CreateReservationInput } from '@/lib/domain/reservations/create';
import { getServiceRoleClient } from '@/lib/supabase/service';

export async function createReservation(
  input: CreateReservationInput
): Promise<{ id?: string; error: string | null }> {
  const supabase = getServiceRoleClient();
  if (!supabase) return { error: 'service role client unavailable' };

  let guestId = input.guestId;
  if (!guestId && input.guestName) {
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .ilike('name', input.guestName)
      .maybeSingle();
    if (existing) {
      guestId = existing.id as string;
    } else {
      const { data: created } = await supabase
        .from('guests')
        .insert({ name: input.guestName })
        .select('id')
        .single();
      guestId = (created as { id: string } | null)?.id ?? null;
    }
  }

  const row = {
    guest_id: guestId,
    room: input.room,
    check_in: input.checkIn,
    check_out: input.checkOut,
    channel: input.channel,
    status: input.status,
    ...(input.externalId ? { external_id: input.externalId } : {}),
  };

  if (input.externalId) {
    const { data, error } = await supabase
      .from('reservations')
      .upsert(row, { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id')
      .single();
    if (error) return { error: error.message };
    return { id: (data as { id: string }).id, error: null };
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert(row)
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id, error: null };
}

