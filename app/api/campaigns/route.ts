import { runCampaign } from '@/lib/services/campaign-service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let subject: string, body: string, guestIds: string[] | undefined;
  try {
    ({ subject, body, guestIds } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!subject || !body) {
    return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 });
  }

  const r = await runCampaign({ subject, body, guestIds });
  if (r.error) {
    const code = r.error.includes('No guests with email') ? 400 : 500;
    return NextResponse.json({ error: r.error }, { status: code });
  }

  return NextResponse.json({ ok: true, sent: r.sent, errors: r.errors });
}
