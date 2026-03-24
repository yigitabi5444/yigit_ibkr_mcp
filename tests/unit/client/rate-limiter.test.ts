import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../../src/client/rate-limiter.js';

describe('RateLimiter', () => {
  it('delays rapid calls to the same rate-limited endpoint', async () => {
    const limiter = new RateLimiter();

    const start = Date.now();
    // /iserver/account/orders has maxRequests=1, windowMs=5000
    await limiter.waitForSlot('/iserver/account/orders');
    await limiter.waitForSlot('/iserver/account/orders');
    const elapsed = Date.now() - start;

    // Second call should have waited ~5 seconds for the window to pass
    expect(elapsed).toBeGreaterThanOrEqual(4500);
  }, 15000);

  it('does not delay calls to different endpoints', async () => {
    const limiter = new RateLimiter();

    const start = Date.now();
    await limiter.waitForSlot('/iserver/account/orders');
    await limiter.waitForSlot('/iserver/account/trades');
    const elapsed = Date.now() - start;

    // Different endpoints should not block each other (under global limit)
    expect(elapsed).toBeLessThan(1000);
  });

  it('enforces global rate limit of 10 requests per second', async () => {
    const limiter = new RateLimiter();

    const start = Date.now();
    // Fire 11 sequential requests to trigger the global limit (10 per 1s window)
    for (let i = 0; i < 11; i++) {
      await limiter.waitForSlot('/some/path');
    }
    const elapsed = Date.now() - start;

    // 11th request should have waited for global window (~1s)
    expect(elapsed).toBeGreaterThanOrEqual(500);
  }, 10000);
});
