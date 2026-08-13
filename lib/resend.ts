import { Resend } from 'resend';

let _client: Resend | null = null;

export function getResend(): Resend {
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

export async function sendCampaign(
  to: string[],
  subject: string,
  body: string
): Promise<{ sent: number; errors: number }> {
  const resend = getResend();
  const FROM = process.env.RESEND_FROM_EMAIL ?? 'geral@alentejostay.pt';

  let sent = 0;
  let errors = 0;

  // Resend free tier: send individually to avoid bulk restrictions
  for (const email of to) {
    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        text: body,
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return { sent, errors };
}
