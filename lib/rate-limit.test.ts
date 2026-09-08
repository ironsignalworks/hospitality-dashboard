import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows up to 10 requests per minute then rejects', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limiter.check('ip', 10)).toBe(true);
    }
    expect(limiter.check('ip', 10)).toBe(false);
  });
});
