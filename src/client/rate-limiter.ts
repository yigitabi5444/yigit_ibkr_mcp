interface RateLimitRule {
  pattern: RegExp;
  maxRequests: number;
  windowMs: number;
}

const RULES: RateLimitRule[] = [
  { pattern: /\/iserver\/account\/orders/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/account\/trades/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/account\/pnl/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/portfolio\/accounts/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/scanner\/params/, maxRequests: 1, windowMs: 900_000 },
  { pattern: /\/iserver\/scanner\/run/, maxRequests: 1, windowMs: 1000 },
  { pattern: /\/iserver\/marketdata\/snapshot/, maxRequests: 10, windowMs: 1000 },
];

const GLOBAL_RULE: RateLimitRule = {
  pattern: /.*/,
  maxRequests: 10,
  windowMs: 1000,
};

export class RateLimiter {
  private windows = new Map<string, number[]>();

  async acquire(path: string): Promise<void> {
    const rule = RULES.find((r) => r.pattern.test(path)) || GLOBAL_RULE;
    const key = rule.pattern.source;

    await this.waitForSlot(key, rule);
    // Also enforce global limit for non-global rules
    if (rule !== GLOBAL_RULE) {
      await this.waitForSlot('__global__', GLOBAL_RULE);
    }
  }

  private async waitForSlot(key: string, rule: RateLimitRule): Promise<void> {
    while (true) {
      const now = Date.now();
      const timestamps = this.windows.get(key) || [];

      // Remove expired timestamps
      const valid = timestamps.filter((t) => now - t < rule.windowMs);
      this.windows.set(key, valid);

      if (valid.length < rule.maxRequests) {
        valid.push(now);
        return;
      }

      // Wait until the oldest timestamp expires
      const waitMs = rule.windowMs - (now - valid[0]) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}
