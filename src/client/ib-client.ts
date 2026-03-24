import { Agent } from 'node:https';
import { Config } from '../config.js';

const httpsAgent = new Agent({ rejectUnauthorized: false });

export class IBClient {
  private baseUrl: string;
  private timeoutMs: number;
  private cachedAccountId: string | undefined;

  constructor(private config: Config) {
    this.baseUrl = config.gatewayUrl + '/v1/api';
    this.timeoutMs = config.timeoutMs;
    this.cachedAccountId = config.accountId;
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const filtered = Object.entries(params).filter(([, v]) => v !== undefined);
      if (filtered.length) {
        url += '?' + new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return this.request<T>(url, opts);
  }

  private async request<T>(url: string, opts: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // @ts-ignore — Node.js fetch supports dispatcher option for custom HTTPS agent
      const res = await fetch(url, {
        ...opts,
        signal: controller.signal,
        // @ts-ignore
        dispatcher: httpsAgent,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || url}`);
      }

      const text = await res.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Surface the real underlying error
        const cause = (err as { cause?: { code?: string } }).cause;
        if (cause?.code) {
          throw new Error(`${cause.code}: Could not connect to ${this.config.gatewayUrl} — ${err.message}`);
        }
        if (err.name === 'AbortError') {
          throw new Error(`Timeout after ${this.timeoutMs}ms connecting to ${this.config.gatewayUrl}`);
        }
        throw err;
      }
      throw new Error(`Unknown error: ${err}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async getDefaultAccountId(): Promise<string> {
    if (this.cachedAccountId) return this.cachedAccountId;
    const data = await this.get<{ accounts?: string[]; selectedAccount?: string }>('/iserver/accounts');
    const id = data?.selectedAccount || data?.accounts?.[0];
    if (!id) throw new Error('No accounts found. Is the Client Portal Gateway authenticated?');
    this.cachedAccountId = id;
    return id;
  }
}
