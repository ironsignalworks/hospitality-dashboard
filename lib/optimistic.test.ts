import { describe, expect, it } from 'vitest';
import { withOptimistic } from './optimistic';

describe('withOptimistic', () => {
  it('keeps the applied state when the request succeeds', async () => {
    let n = 0;
    await withOptimistic(
      () => {
        n = 1;
      },
      () => {
        n = 0;
      },
      async () => 7
    );
    expect(n).toBe(1);
  });

  it('reverts when the request fails', async () => {
    let n = 0;
    await expect(
      withOptimistic(
        () => {
          n = 1;
        },
        () => {
          n = 0;
        },
        async () => {
          throw new Error('fail');
        }
      )
    ).rejects.toThrow('fail');
    expect(n).toBe(0);
  });
});
