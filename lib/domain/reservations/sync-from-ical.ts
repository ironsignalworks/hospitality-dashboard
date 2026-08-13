import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAndParseICal } from '@/lib/beds24';

export type IcalSource = { url: string; room: string };

export type RoomSyncResult = { upserted: number; errors: string[] };

/**
 * Ingests parsed iCal events into `guests` and `reservations` (idempotent on `external_id`).
 */
export async function syncReservationsFromIcalSources(
  supabase: SupabaseClient,
  sources: IcalSource[]
): Promise<Record<string, RoomSyncResult>> {
  const results: Record<string, RoomSyncResult> = {};

  for (const source of sources) {
    if (!source.url) {
      results[source.room] = { upserted: 0, errors: ['URL não configurado'] };
      continue;
    }

    const roomResult: RoomSyncResult = { upserted: 0, errors: [] };
    try {
      const events = await fetchAndParseICal(source.url);

      for (const ev of events) {
        if (!ev.start || !ev.end) continue;

        let guestId: string | null = null;
        if (ev.guestName) {
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .ilike('name', ev.guestName)
            .maybeSingle();

          if (existingGuest) {
            guestId = existingGuest.id;
          } else {
            const { data: newGuest } = await supabase
              .from('guests')
              .insert({ name: ev.guestName })
              .select()
              .single();
            guestId = newGuest?.id ?? null;
          }
        }

        const { error } = await supabase.from('reservations').upsert(
          {
            external_id: ev.externalId,
            guest_id: guestId,
            room: source.room,
            check_in: ev.start,
            check_out: ev.end,
            channel: ev.channel,
            status: 'confirmed',
          },
          { onConflict: 'external_id', ignoreDuplicates: false }
        );

        if (error) {
          roomResult.errors.push(error.message);
        } else {
          roomResult.upserted++;
        }
      }
    } catch (err) {
      roomResult.errors.push(String(err));
    }

    results[source.room] = roomResult;
  }

  return results;
}
