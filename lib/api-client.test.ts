import { describe, expect, it, vi } from 'vitest';
import { ApiError, fetchApiJson, shouldRetryRequest } from './api-client';

describe('shouldRetryRequest', () => {
  it('retries GET 503 and any 429', () => {
    expect(shouldRetryRequest('GET', 503, false)).toBe(true);
    expect(shouldRetryRequest('POST', 503, false)).toBe(false);
    expect(shouldRetryRequest('POST', 429, false)).toBe(true);
    expect(shouldRetryRequest('POST', null, true)).toBe(true);
    expect(shouldRetryRequest('GET', 400, false)).toBe(false);
  });
});

describe('fetchApiJson', () => {
  it('retries GET 503 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Simulated network error', code: 'SIMULATED_ERROR' }), {
          status: 503,
          headers: { 'X-Request-ID': 'rid-1' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'X-Request-ID': 'rid-1' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const json = await fetchApiJson<{ data: unknown[] }>('/api/reservations');
    expect(json.data).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('throws ApiError with code on 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Double booking', code: 'CONFLICT' }), {
          status: 409,
          headers: { 'X-Request-ID': 'abc' },
        })
      )
    );
    try {
      await fetchApiJson('/api/reservations', { method: 'POST', body: '{}' });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe('CONFLICT');
      expect((e as ApiError).status).toBe(409);
    }
    vi.unstubAllGlobals();
  });
});
