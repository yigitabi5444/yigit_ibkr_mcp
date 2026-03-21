import https from 'node:https';
import http from 'node:http';
import { Config } from '../config.js';
import { RateLimiter } from './rate-limiter.js';

export class IBApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'IBApiError';
  }
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

interface HttpResponse {
  statusCode: number;
  body: string;
}

export class IBClient {
  private baseUrl: string;
  private rateLimiter: RateLimiter;
  private timeoutMs: number;
  private cachedAccountId: string | undefined;
  private onUnauthorized: (() => Promise<boolean>) | undefined;
  private httpsAgent: https.Agent | undefined;

  constructor(config: Config, rateLimiter: RateLimiter) {
    this.baseUrl = `${config.gatewayUrl}${config.apiBase}`;
    this.rateLimiter = rateLimiter;
    this.timeoutMs = config.requestTimeoutMs;
    this.cachedAccountId = config.defaultAccountId;

    // Create a persistent HTTPS agent with TLS settings.
    // IB Gateway uses a self-signed certificate — rejectUnauthorized must be
    // set on an Agent for reliable behavior across Node.js versions.
    if (config.gatewayUrl.startsWith('https')) {
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: config.sslVerify,
        keepAlive: true,
      });
    }
  }

  setOnUnauthorized(handler: () => Promise<boolean>): void {
    this.onUnauthorized = handler;
  }

  async getDefaultAccountId(): Promise<string> {
    if (this.cachedAccountId) return this.cachedAccountId;

    const data = await this.get<{ accounts?: string[] }>('/iserver/accounts');
    if (!data.accounts?.length) {
      throw new SessionError('No accounts found');
    }
    this.cachedAccountId = data.accounts[0];
    return this.cachedAccountId;
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return this.request<T>('GET', url, path);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    return this.request<T>('POST', url, path, body);
  }

  private async request<T>(method: string, url: URL, path: string, body?: unknown): Promise<T> {
    await this.rateLimiter.acquire(path);

    const response = await this.doRequest(method, url, body);

    if (response.statusCode === 401) {
      if (this.onUnauthorized) {
        const reauthed = await this.onUnauthorized();
        if (reauthed) {
          const retryResponse = await this.doRequest(method, url, body);
          return this.parseResponse<T>(retryResponse, path);
        }
      }
      throw new SessionError('Not authenticated. IB Gateway may need manual login.');
    }

    return this.parseResponse<T>(response, path);
  }

  private doRequest(method: string, url: URL, body?: unknown): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;
      const bodyStr = body ? JSON.stringify(body) : undefined;

      const options: https.RequestOptions = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        timeout: this.timeoutMs,
        headers: {},
        ...(isHttps && this.httpsAgent ? { agent: this.httpsAgent } : {}),
      };

      if (bodyStr) {
        options.headers = {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        };
      }

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: data });
        });
      });

      req.on('error', (err: NodeJS.ErrnoException) => {
        const code = err.code || 'UNKNOWN';
        const detail = `${method} ${url.href} failed: ${code} — ${err.message}`;
        reject(new Error(detail));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeoutMs}ms: ${method} ${url.pathname}`));
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  private parseResponse<T>(response: HttpResponse, path: string): T {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      let body: unknown;
      try {
        body = JSON.parse(response.body);
      } catch {
        body = response.body;
      }
      throw new IBApiError(`IB API error on ${path}: ${response.statusCode}`, response.statusCode, body);
    }

    if (!response.body) return {} as T;
    try {
      return JSON.parse(response.body) as T;
    } catch {
      return response.body as unknown as T;
    }
  }
}
