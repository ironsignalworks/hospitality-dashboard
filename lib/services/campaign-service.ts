import { createClient } from '@/lib/supabase/server';
import { sendCampaign } from '@/lib/resend';

export async function runCampaign(input: {
  subject: string;
  body: string;
  guestIds?: string[];
}) {
  const { subject, body, guestIds } = input;
  const supabase = await createClient();

  let query = supabase.from('guests').select('email').not('email', 'is', null);
  if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
    query = query.in('id', guestIds);
  }

  const { data: guests, error } = await query;
  if (error) {
    return { error: error.message, sent: 0, errors: [] as string[] };
  }

  const emails = (guests ?? []).map((g) => g.email as string).filter(Boolean);
  if (emails.length === 0) {
    return { error: 'No guests with email found.', sent: 0, errors: [] as string[] };
  }

  const { sent, errors } = await sendCampaign(emails, subject, body);

  await supabase.from('email_campaigns').insert({
    subject,
    body,
    sent_at: new Date().toISOString(),
    recipient_count: sent,
  });

  return { error: null as null, sent, errors };
}
