import {
  IBApiNext,
  IBApi,
  MarketDataType,
} from '@stoqey/ib';
import { firstValueFrom, lastValueFrom, Observable, timeout } from 'rxjs';
import { Config } from './config.js';

export class IBConnection {
  private api: IBApiNext;
  private _rawApi: IBApi;
  private _connected = false;
  private cachedAccountId: string | undefined;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cachedAccountId = config.accountId;

    this.api = new IBApiNext({
      host: config.host,
      port: config.port,
      reconnectInterval: 5000,
    });

    // Access the underlying IBApi for low-level event-based calls (news)
    this._rawApi = (this.api as unknown as { api: IBApi }).api;
  }

  async connect(): Promise<void> {
    this.api.connect(this.config.clientId);

    // Wait for connection to establish
    await new Promise<void>((resolve, reject) => {
      const checkTimeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.config.timeoutMs}ms to ${this.config.host}:${this.config.port}`));
      }, this.config.timeoutMs);

      const checkInterval = setInterval(() => {
        if (this.api.isConnected) {
          clearTimeout(checkTimeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    this._connected = true;

    // Set market data type
    this.api.setMarketDataType(this.config.marketDataType as MarketDataType);

    // Resolve account ID if not provided
    if (!this.cachedAccountId) {
      const accounts = await this.api.getManagedAccounts();
      if (!accounts.length) {
        throw new Error('No managed accounts found');
      }
      this.cachedAccountId = accounts[0];
    }
  }

  disconnect(): void {
    this.api.disconnect();
    this._connected = false;
  }

  get ib(): IBApiNext {
    return this.api;
  }

  get rawIb(): IBApi {
    return this._rawApi;
  }

  get isConnected(): boolean {
    return this._connected && this.api.isConnected;
  }

  async getAccountId(): Promise<string> {
    if (this.cachedAccountId) return this.cachedAccountId;
    const accounts = await this.api.getManagedAccounts();
    if (!accounts.length) throw new Error('No managed accounts found');
    this.cachedAccountId = accounts[0];
    return this.cachedAccountId;
  }

  /**
   * Get first value from a streaming Observable (never-completing).
   * Subscribes, takes the first emission, auto-unsubscribes.
   */
  async subscribeFirst<T>(observable: Observable<T>, timeoutMs?: number): Promise<T> {
    return firstValueFrom(
      observable.pipe(timeout(timeoutMs ?? this.config.timeoutMs)),
    );
  }

  /**
   * Get the final value from an Observable that completes naturally.
   * Used for getHistoricalData, getContractDetails, etc.
   */
  async subscribeCollect<T>(observable: Observable<T>, timeoutMs?: number): Promise<T> {
    return lastValueFrom(
      observable.pipe(timeout(timeoutMs ?? this.config.timeoutMs)),
    );
  }
}
