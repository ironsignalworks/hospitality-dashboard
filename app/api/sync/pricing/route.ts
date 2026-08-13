import { isAuthorizedCronOrInternalRequest } from '@/lib/internal-api';
import { enqueuePushPricing } from '@/lib/sync/jobs/push-pricing';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isAuthorizedCronOrInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = await enqueuePushPricing();
  return NextResponse.json({ ok: true, job: res });
}

export async function GET(request: Request) {
  return POST(request);
}
