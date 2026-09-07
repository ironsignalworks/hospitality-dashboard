import { NextResponse } from 'next/server';
import { IS_DEMO } from '@/lib/demo';
import { limiter } from '@/lib/rate-limit';

export const DEMO_RATE_LIMIT_PER_MIN = 10;

export type ApiErrorCode =
  | 'NOT_DEMO'
  | 'RATE_LIMITED'
  | 'SIMULATED_ERROR'
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNKNOWN_ACTION';

export function requestIdFrom(request: Request): string {
  const existing = request.headers.get('x-request-id')?.trim();
  return existing || crypto.randomUUID();
}

type DemoJsonInit = {
  status?: number;
  cache?: boolean;
  headers?: HeadersInit;
};

export function demoJson(request: Request, body: unknown, init: DemoJsonInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('X-Request-ID', requestIdFrom(request));
  headers.set(
    'Cache-Control',
    init.cache ? 'private, max-age=10, stale-while-revalidate=30' : 'no-store'
  );
  return NextResponse.json(body, { status: init.status ?? 200, headers });
}

export function demoError(
  request: Request,
  error: string,
  code: ApiErrorCode,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return demoJson(request, { error, code, ...extra }, { status });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

/** Demo-only: 403 outside demo, 429 if over limit, optional 503, plus 100–500ms latency. */
export async function guardDemoApi(request: Request): Promise<NextResponse | null> {
  if (!IS_DEMO) {
    return demoError(request, 'Not in demo mode', 'NOT_DEMO', 403);
  }
  if (!limiter.check(`demo:${clientKey(request)}`, DEMO_RATE_LIMIT_PER_MIN)) {
    const res = demoError(request, 'Rate limit exceeded', 'RATE_LIMITED', 429);
    res.headers.set('Retry-After', '60');
    return res;
  }
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
  if (process.env.DEMO_SIMULATE_ERRORS === '1' && Math.random() < 0.02) {
    return demoError(request, 'Simulated network error', 'SIMULATED_ERROR', 503);
  }
  return null;
}

export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return demoError(request, 'Invalid JSON', 'INVALID_JSON', 400);
    }
    return body as Record<string, unknown>;
  } catch {
    return demoError(request, 'Invalid JSON', 'INVALID_JSON', 400);
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
