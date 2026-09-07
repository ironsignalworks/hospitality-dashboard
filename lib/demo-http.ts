import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/demo';
import { limiter } from '@/lib/rate-limit';

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

/** Demo-only: 403 outside demo, 429 if over limit, optional 503, plus 100–500ms latency. */
export async function guardDemoApi(request: Request): Promise<NextResponse | null> {
  if (!IS_DEMO) {
    return NextResponse.json({ error: 'Not in demo mode' }, { status: 403 });
  }
  if (!limiter.check(`demo:${clientKey(request)}`)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
  if (process.env.DEMO_SIMULATE_ERRORS === '1' && Math.random() < 0.02) {
    return NextResponse.json({ error: 'Simulated network error' }, { status: 503 });
  }
  return null;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    return body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export function stripDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.split('T')[0] ?? value;
}

export function jsonNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
