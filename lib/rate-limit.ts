export class RateLimiter {
  private requests = new Map<string, number[]>();

  check(key: string, limit = 10, windowMs = 60_000): boolean {
    const now = Date.now();
    const recent = (this.requests.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      this.requests.set(key, recent);
      return false;
    }
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

export const limiter = new RateLimiter();
