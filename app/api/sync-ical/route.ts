import { runIcalSync } from '@/lib/services/sync-service';
import { isAuthorizedSyncTrigger } from '@/lib/internal-api';
import { NextResponse } from 'next/server';

// Called by: Vercel Cron (vercel.json), Netlify Scheduled Function (netlify/functions/sync-ical.ts),
// or manually from the dashboard.

export async function POST(request: Request) {
  if (!isAuthorizedSyncTrigger(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runIcalSync();
  return NextResponse.json({ ok: true, results });
}

// Vercel cron calls GET; reuse POST handler
export async function GET(request: Request) {
  return POST(request);
}
