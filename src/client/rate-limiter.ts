interface RateRule {
  pattern: RegExp;
  maxRequests: number;
  windowMs: number;
}

const RULES: RateRule[] = [
  { pattern: /\/iserver\/account\/orders/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/account\/trades/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/account\/pnl/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/portfolio\/accounts/, maxRequests: 1, windowMs: 5000 },
  { pattern: /\/iserver\/scanner\/params/, maxRequests: 1, windowMs: 900000 },
  { pattern: /\/iserver\/scanner\/run/, maxRequests: 1, windowMs: 1000 },
  { pattern: /\/pa\/performance/, maxRequests: 1, windowMs: 900000 },
  { pattern: /\/pa\/transactions/, maxRequests: 1, windowMs: 900000 },
];

const GLOBAL_MAX = 10;
const GLOBAL_WINDOW_MS = 1000;

export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private globalTimestamps: number[] = [];

  async waitForSlot(path: string): Promise<void> {
    // Global rate limit
    await this.waitForRule('__global__', GLOBAL_MAX, GLOBAL_WINDOW_MS);

    // Per-endpoint rules
    for (const rule of RULES) {
      if (rule.pattern.test(path)) {
        await this.waitForRule(rule.pattern.source, rule.maxRequests, rule.windowMs);
        break;
      }
    }

    // Record this request
    const now = Date.now();
    this.globalTimestamps.push(now);
    for (const rule of RULES) {
      if (rule.pattern.test(path)) {
        const key = rule.pattern.source;
        if (!this.timestamps.has(key)) this.timestamps.set(key, []);
        this.timestamps.get(key)!.push(now);
        break;
      }
    }
  }

  private async waitForRule(key: string, max: number, windowMs: number): Promise<void> {
    const timestamps = key === '__global__'
      ? this.globalTimestamps
      : (this.timestamps.get(key) || []);

    while (true) {
      const now = Date.now();
      const cutoff = now - windowMs;

      // Clean old timestamps
      while (timestamps.length && timestamps[0] <= cutoff) {
        timestamps.shift();
      }

      if (timestamps.length < max) return;

      // Wait until the oldest timestamp expires
      const waitMs = timestamps[0] - cutoff + 10;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}
