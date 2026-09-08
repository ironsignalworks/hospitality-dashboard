export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(message: string, status: number, code: string | null, requestId: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readErrorPayload(json: unknown): { message: string; code: string | null } {
  if (!json || typeof json !== 'object') return { message: 'API error', code: null };
  const rec = json as Record<string, unknown>;
  const message = typeof rec.error === 'string' ? rec.error : 'API error';
  const code = typeof rec.code === 'string' ? rec.code : null;
  return { message, code };
}

export function shouldRetryRequest(method: string, status: number | null, networkError: boolean): boolean {
  const m = method.toUpperCase();
  if (networkError) return true;
  if (status === 429) return true;
  if (status === 503 && (m === 'GET' || m === 'HEAD')) return true;
  return false;
}

export async function fetchApiJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const maxAttempts = 3;
  const requestId =
    (options.headers instanceof Headers
      ? options.headers.get('x-request-id')
      : undefined) || crypto.randomUUID();

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error('Request aborted');
    }
    try {
      const headers = new Headers(options.headers);
      headers.set('X-Request-ID', requestId);
      const response = await fetch(endpoint, { ...options, headers });
      const json: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const { message, code } = readErrorPayload(json);
        const status = response.status;
        const echoedId = response.headers.get('x-request-id');
        if (
          attempt < maxAttempts - 1 &&
          shouldRetryRequest(method, status, false)
        ) {
          await sleep(status === 429 ? 700 * (attempt + 1) : 200 * (attempt + 1));
          continue;
        }
        throw new ApiError(
          message || `API error: ${status}`,
          status,
          code,
          echoedId
        );
      }
      return json as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastError = e;
      if (attempt < maxAttempts - 1 && shouldRetryRequest(method, null, true)) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      throw e instanceof Error ? e : new Error('Network error');
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network error');
}
