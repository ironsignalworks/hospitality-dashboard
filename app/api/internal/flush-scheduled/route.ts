import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedSyncTrigger } from '@/lib/internal-api';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { getResend } from '@/lib/resend';

export async function POST(request: NextRequest) {
  if (!isAuthorizedSyncTrigger(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service role client unavailable' }, { status: 500 });
  }

  const now = new Date().toISOString();

  // ── 1. Flush scheduled messages ──────────────────────────────────────────────
  const { data: dueMessages, error: msgError } = await supabase
    .from('messages')
    .select('id')
    .eq('role', 'owner')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now);

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  let flushedMessages = 0;
  if (dueMessages && dueMessages.length > 0) {
    const ids = dueMessages.map((r: { id: string }) => r.id);
    await supabase.from('messages').update({ scheduled_at: null }).in('id', ids);
    flushedMessages = ids.length;
  }

  // ── 2. Deliver due guest alerts ───────────────────────────────────────────────
  const { data: dueAlerts, error: alertError } = await supabase
    .from('guest_alerts')
    .select('id, message, notify_at, guest:guests(name)')
    .is('delivered_at', null)
    .is('dismissed_at', null)
    .lte('notify_at', now);

  let flushedAlerts = 0;
  if (!alertError && dueAlerts && dueAlerts.length > 0) {
    const alertIds = dueAlerts.map((a: { id: string }) => a.id);

    await supabase
      .from('guest_alerts')
      .update({ delivered_at: now })
      .in('id', alertIds);

    flushedAlerts = alertIds.length;

    // Send email to owner if Resend is configured
    const ownerEmail = process.env.OWNER_EMAIL || process.env.RESEND_FROM_EMAIL;
    if (ownerEmail && process.env.RESEND_API_KEY) {
      const resend = getResend();
      const from = process.env.RESEND_FROM_EMAIL ?? 'geral@alentejostay.pt';
      for (const alert of dueAlerts as Array<{ id: string; message: string; notify_at: string; guest: { name: string }[] | null }>) {
        const guestName = alert.guest?.[0]?.name ?? 'Guest';
        await resend.emails
          .send({
            from,
            to: ownerEmail,
            subject: `Reminder — ${guestName}`,
            text: `Reminder about guest ${guestName}:\n\n${alert.message}\n\nSet for: ${new Date(alert.notify_at).toLocaleString('en-GB')}`,
          })
          .catch(() => {});
      }
    }
  }

  return NextResponse.json({ flushedMessages, flushedAlerts });
}
