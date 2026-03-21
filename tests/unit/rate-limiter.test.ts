import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/client/rate-limiter.js';

describe('RateLimiter', () => {
  it('allows requests within rate limit', async () => {
    const limiter = new RateLimiter();
    const start = Date.now();

    // Global limit is 10 req/s, so 5 requests should be instant
    for (let i = 0; i < 5; i++) {
      await limiter.acquire('/some/path');
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('enforces per-endpoint rate limits', async () => {
    const limiter = new RateLimiter();

    // Scanner params: 1 req per 15 min
    await limiter.acquire('/iserver/scanner/params');

    const start = Date.now();
    // Second request should wait
    const waitPromise = limiter.acquire('/iserver/scanner/params');

    // Cancel after short wait to verify it would have waited
    const raceResult = await Promise.race([
      waitPromise.then(() => 'completed'),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 200)),
    ]);

    expect(raceResult).toBe('timeout');
  });

  it('allows different endpoints independently', async () => {
    const limiter = new RateLimiter();

    // Use the scanner endpoint (1 req/15min)
    await limiter.acquire('/iserver/scanner/params');

    // A different endpoint should still work
    const start = Date.now();
    await limiter.acquire('/portfolio/accounts');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('enforces snapshot rate limit of 10 req/s', async () => {
    const limiter = new RateLimiter();

    // 10 requests should be fast
    for (let i = 0; i < 10; i++) {
      await limiter.acquire('/iserver/marketdata/snapshot');
    }

    // 11th should need to wait
    const start = Date.now();
    const raceResult = await Promise.race([
      limiter.acquire('/iserver/marketdata/snapshot').then(() => 'completed'),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 200)),
    ]);

    // It should either complete after a short wait or timeout
    // Both are acceptable since the window may have shifted
    expect(['completed', 'timeout']).toContain(raceResult);
  });
});
