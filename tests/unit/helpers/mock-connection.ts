import { vi } from 'vitest';
import { Observable, of } from 'rxjs';
import { IBConnection } from '../../../src/connection.js';

export interface MockIBApiNext {
  getManagedAccounts: ReturnType<typeof vi.fn>;
  getAccountSummary: ReturnType<typeof vi.fn>;
  getPositions: ReturnType<typeof vi.fn>;
  getPnL: ReturnType<typeof vi.fn>;
  getPnLSingle: ReturnType<typeof vi.fn>;
  getMarketDataSnapshot: ReturnType<typeof vi.fn>;
  getHistoricalData: ReturnType<typeof vi.fn>;
  getMatchingSymbols: ReturnType<typeof vi.fn>;
  getContractDetails: ReturnType<typeof vi.fn>;
  getSecDefOptParams: ReturnType<typeof vi.fn>;
  getScannerParameters: ReturnType<typeof vi.fn>;
  getMarketScanner: ReturnType<typeof vi.fn>;
  getAllOpenOrders: ReturnType<typeof vi.fn>;
  getExecutionDetails: ReturnType<typeof vi.fn>;
  setMarketDataType: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  isConnected: boolean;
}

export interface MockIBApi {
  reqNewsProviders: ReturnType<typeof vi.fn>;
  reqHistoricalNews: ReturnType<typeof vi.fn>;
  reqNewsArticle: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

export function createMockConnection(): {
  conn: IBConnection;
  mockApi: MockIBApiNext;
  mockRawApi: MockIBApi;
} {
  const mockApi: MockIBApiNext = {
    getManagedAccounts: vi.fn(),
    getAccountSummary: vi.fn(),
    getPositions: vi.fn(),
    getPnL: vi.fn(),
    getPnLSingle: vi.fn(),
    getMarketDataSnapshot: vi.fn(),
    getHistoricalData: vi.fn(),
    getMatchingSymbols: vi.fn(),
    getContractDetails: vi.fn(),
    getSecDefOptParams: vi.fn(),
    getScannerParameters: vi.fn(),
    getMarketScanner: vi.fn(),
    getAllOpenOrders: vi.fn(),
    getExecutionDetails: vi.fn(),
    setMarketDataType: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: true,
  };

  const mockRawApi: MockIBApi = {
    reqNewsProviders: vi.fn(),
    reqHistoricalNews: vi.fn(),
    reqNewsArticle: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  // Create a mock IBConnection
  const conn = {
    ib: mockApi,
    rawIb: mockRawApi,
    isConnected: true,
    getAccountId: vi.fn().mockResolvedValue('U1234567'),
    subscribeFirst: vi.fn(async (obs: Observable<unknown>) => {
      const { firstValueFrom } = await import('rxjs');
      return firstValueFrom(obs);
    }),
    subscribeCollect: vi.fn(async (obs: Observable<unknown>) => {
      const { lastValueFrom } = await import('rxjs');
      return lastValueFrom(obs);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as IBConnection;

  return { conn, mockApi, mockRawApi };
}
