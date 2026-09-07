export async function fetchApiJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, options);
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : `API error: ${response.status}`;
    throw new Error(message);
  }
  return json as T;
}
