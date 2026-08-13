import { IS_DEMO } from '@/lib/demo';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  if (IS_DEMO) return NextResponse.json([]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guest_alerts')
    .select('*, guest:guests(id, name)')
    .is('dismissed_at', null)
    .order('notify_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  if (IS_DEMO) return NextResponse.json({ ok: true, alert: null });

  let guest_id: string, message: string, notify_at: string;
  try {
    ({ guest_id, message, notify_at } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!guest_id || !message?.trim() || !notify_at) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guest_alerts')
    .insert({ guest_id, message: message.trim(), notify_at })
    .select('*, guest:guests(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, alert: data });
}

export async function PATCH(request: NextRequest) {
  if (IS_DEMO) return NextResponse.json({ ok: true });

  let id: string;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('guest_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO) return NextResponse.json({ ok: true });

  let id: string;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('guest_alerts').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
