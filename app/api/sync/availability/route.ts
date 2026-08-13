import { isAuthorizedCronOrInternalRequest } from '@/lib/internal-api';
import { enqueuePushAvailability } from '@/lib/sync/jobs/push-availability';
import { NextResponse } from 'next/server';

/** Enqueue/drive availability push to channels (Airbnb, Booking, etc.). */
export async function POST(request: Request) {
  if (!isAuthorizedCronOrInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = await enqueuePushAvailability();
  return NextResponse.json({ ok: true, job: res });
}

export async function GET(request: Request) {
  return POST(request);
}
