import { IBClient } from './ib-client.js';

// Paths that work without brokerage session (read-only tier)
const READ_ONLY_PATTERNS = [
  /^\/portfolio\//,
  /^\/pa\//,
  /^\/trsrv\//,
  /^\/iserver\/secdef\//,
  /^\/iserver\/contract\/\d+\/info/,
];

export class SessionManager {
  private tickleTimer: ReturnType<typeof setInterval> | null = null;
  private lastBrokerageCallTime = 0;
  private brokerageActive = false;

  constructor(
    private client: IBClient,
    private tickleIntervalMs: number,
    private brokerageTimeoutMs: number,
  ) {}

  /** Is this path read-only (no brokerage session needed)? */
  isReadOnly(path: string): boolean {
    return READ_ONLY_PATTERNS.some((p) => p.test(path));
  }

  /** Call before any /iserver/* brokerage endpoint */
  async ensureBrokerageSession(): Promise<void> {
    this.lastBrokerageCallTime = Date.now();

    if (!this.brokerageActive) {
      // Initialize brokerage session
      try {
        await this.client.post('/iserver/auth/ssodh/init');
      } catch {
        // May fail if already active, that's fine
      }
      this.brokerageActive = true;
      this.startTickle();
    }
  }

  /** Start auto-tickle loop */
  private startTickle(): void {
    if (this.tickleTimer) return;

    this.tickleTimer = setInterval(async () => {
      // Check if brokerage session should be released
      const idle = Date.now() - this.lastBrokerageCallTime;
      if (idle > this.brokerageTimeoutMs) {
        this.stopTickle();
        this.brokerageActive = false;
        process.stderr.write('[ibkr-mcp] Brokerage session released (idle timeout). Phone can reconnect.\n');
        return;
      }

      try {
        const data = await this.client.post<{ competing?: boolean }>('/tickle');
        if (data?.competing) {
          process.stderr.write('[ibkr-mcp] Warning: Competing brokerage session detected.\n');
        }
      } catch (err) {
        process.stderr.write(`[ibkr-mcp] Tickle failed: ${(err as Error).message}\n`);
      }
    }, this.tickleIntervalMs);
  }

  /** Stop tickle loop — brokerage session will time out on IB side */
  private stopTickle(): void {
    if (this.tickleTimer) {
      clearInterval(this.tickleTimer);
      this.tickleTimer = null;
    }
  }

  /** Check if gateway is authenticated */
  async checkAuth(): Promise<{ authenticated: boolean; competing: boolean; connected: boolean }> {
    try {
      const data = await this.client.post<{ authenticated?: boolean; competing?: boolean; connected?: boolean }>(
        '/iserver/auth/status',
      );
      return {
        authenticated: !!data?.authenticated,
        competing: !!data?.competing,
        connected: !!data?.connected,
      };
    } catch {
      return { authenticated: false, competing: false, connected: false };
    }
  }

  stop(): void {
    this.stopTickle();
  }
}
