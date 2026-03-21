import { IBClient } from './ib-client.js';

interface AuthStatus {
  authenticated: boolean;
  competing: boolean;
  connected: boolean;
  message: string;
  fail?: string;
}

export class SessionManager {
  private tickleTimer: ReturnType<typeof setInterval> | null = null;
  private authenticated = false;
  private client: IBClient;
  private tickleIntervalMs: number;

  constructor(client: IBClient, tickleIntervalMs: number) {
    this.client = client;
    this.tickleIntervalMs = tickleIntervalMs;

    // Wire up re-auth on 401
    this.client.setOnUnauthorized(async () => {
      return this.reauthenticate();
    });
  }

  async start(): Promise<void> {
    await this.checkAuthStatus();
    this.tickleTimer = setInterval(() => {
      this.tickle().catch(() => {});
    }, this.tickleIntervalMs);
  }

  stop(): void {
    if (this.tickleTimer) {
      clearInterval(this.tickleTimer);
      this.tickleTimer = null;
    }
  }

  async checkAuthStatus(): Promise<AuthStatus> {
    try {
      const status = await this.client.post<AuthStatus>('/iserver/auth/status');
      this.authenticated = status.authenticated ?? false;
      return {
        authenticated: this.authenticated,
        competing: status.competing ?? false,
        connected: status.connected ?? false,
        message: status.message ?? '',
        fail: status.fail,
      };
    } catch (err) {
      this.authenticated = false;
      const detail = err instanceof Error ? err.message : String(err);
      return {
        authenticated: false,
        competing: false,
        connected: false,
        message: `Failed to connect to IB Gateway: ${detail}`,
      };
    }
  }

  async tickle(): Promise<void> {
    try {
      await this.client.post('/tickle');
    } catch {
      await this.checkAuthStatus();
    }
  }

  async reauthenticate(): Promise<boolean> {
    try {
      await this.client.post('/iserver/reauthenticate');
      // Wait for re-auth to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await this.checkAuthStatus();
      return status.authenticated;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Re-authentication failed: ${detail}`);
    }
  }

  async ensureSession(): Promise<void> {
    if (!this.authenticated) {
      const status = await this.checkAuthStatus();
      if (!status.authenticated) {
        const success = await this.reauthenticate();
        if (!success) {
          throw new Error('IB Gateway session not authenticated. Please login to IB Gateway.');
        }
      }
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}
