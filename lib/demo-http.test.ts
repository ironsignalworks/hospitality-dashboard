import { describe, expect, it } from 'vitest';
import { demoError, demoJson, requestIdFrom } from './demo-http';

describe('demo HTTP helpers', () => {
  it('reuses incoming X-Request-ID', () => {
    const req = new Request('http://localhost/api/reservations', {
      headers: { 'X-Request-ID': 'client-id' },
    });
    expect(requestIdFrom(req)).toBe('client-id');
  });

  it('sets structured error code and request id', async () => {
    const req = new Request('http://localhost/api/reservations', {
      headers: { 'X-Request-ID': 'rid-9' },
    });
    const res = demoError(req, 'Rate limit exceeded', 'RATE_LIMITED', 429);
    expect(res.status).toBe(429);
    expect(res.headers.get('X-Request-ID')).toBe('rid-9');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('sets cache headers on GET payloads', () => {
    const req = new Request('http://localhost/api/reservations');
    const res = demoJson(req, { data: [] }, { cache: true });
    expect(res.headers.get('Cache-Control')).toContain('max-age=10');
    expect(res.headers.get('X-Request-ID')).toBeTruthy();
  });
});
