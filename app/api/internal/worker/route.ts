import { isAuthorizedCronOrInternalRequest } from '@/lib/internal-api';
import { processOneSyncJob } from '@/lib/sync/worker';
import { NextResponse } from 'next/server';

/**
 * Dequeues one `sync_jobs` row (see migration `002_sync_jobs.sql`). Add to `vercel.json` crons
 * when the queue is live.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronOrInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const out = await processOneSyncJob();
  return NextResponse.json(out);
}

export async function GET(request: Request) {
  return POST(request);
}
