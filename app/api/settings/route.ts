import { IS_DEMO } from '@/lib/demo';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  settingsToRows,
  type AppSettings,
} from '@/lib/services/settings-service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  if (IS_DEMO) return NextResponse.json(DEFAULT_SETTINGS);

  const supabase = await createClient();
  const { data } = await supabase
    .from('concierge_content')
    .select('key, value')
    .like('key', 'setting_%');

  return NextResponse.json(data?.length ? parseSettings(data) : DEFAULT_SETTINGS);
}

export async function PATCH(request: Request) {
  if (IS_DEMO) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Partial<AppSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const roomCount = Number(body.room_count);
  if (!Number.isFinite(roomCount) || roomCount < 1 || roomCount > 6) {
    return NextResponse.json({ error: 'Número de quartos inválido (1–6).' }, { status: 400 });
  }

  const rawNames = body.room_names;
  if (
    !Array.isArray(rawNames) ||
    rawNames.length !== roomCount ||
    rawNames.some((n) => !String(n).trim())
  ) {
    return NextResponse.json({ error: 'Nomes dos quartos inválidos.' }, { status: 400 });
  }

  const settings: AppSettings = {
    room_count: roomCount,
    room_names: rawNames.map((n) => String(n).trim()),
    property_name:
      String(body.property_name ?? DEFAULT_SETTINGS.property_name).trim() ||
      DEFAULT_SETTINGS.property_name,
    checkin_time: String(body.checkin_time ?? DEFAULT_SETTINGS.checkin_time),
    checkout_time: String(body.checkout_time ?? DEFAULT_SETTINGS.checkout_time),
  };

  const { error } = await supabase
    .from('concierge_content')
    .upsert(settingsToRows(settings), { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'Erro ao guardar.' }, { status: 500 });
  return NextResponse.json({ ok: true, settings });
}
