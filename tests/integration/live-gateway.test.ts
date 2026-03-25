import { describe, it, expect, beforeAll } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { IBClient } from '../../src/client/ib-client.js';

const GATEWAY_URL = process.env.IBKR_GATEWAY_URL;

// Skip entire suite if no gateway URL is configured
const describeIf = GATEWAY_URL ? describe : describe.skip;

describeIf('Live Client Portal Gateway Integration', () => {
  let client: IBClient;
  let accountId: string;

  beforeAll(async () => {
    const config = loadConfig();
    client = new IBClient(config);

    // Verify gateway is authenticated
    const status = await client.get<{ authenticated: boolean; connected: boolean }>('/iserver/auth/status');
    if (!status.authenticated) {
      throw new Error('Client Portal Gateway is not authenticated. Login at ' + config.gatewayUrl);
    }

    accountId = await client.getDefaultAccountId();
  }, 30000);

  it('checks auth status', async () => {
    const status = await client.get<{ authenticated: boolean; connected: boolean }>('/iserver/auth/status');
    expect(status.authenticated).toBe(true);
    expect(status.connected).toBe(true);
  });

  it('gets accounts', async () => {
    const data = await client.get<{ accounts?: string[] }>('/iserver/accounts');
    expect(data.accounts).toBeDefined();
    expect(data.accounts!.length).toBeGreaterThan(0);
  });

  it('gets account summary', async () => {
    const summary = await client.get(`/portfolio/${accountId}/summary`);
    expect(summary).toBeDefined();
  });

  it('gets positions', async () => {
    const page0 = await client.get<unknown[]>(`/portfolio/${accountId}/positions/0`);
    expect(Array.isArray(page0)).toBe(true);
  });

  it('gets account allocation', async () => {
    const allocation = await client.get(`/portfolio/${accountId}/allocation`);
    expect(allocation).toBeDefined();
  });

  it('searches for AAPL', async () => {
    const results = await client.post<Array<{ conid: number; companyName: string }>>('/iserver/secdef/search', { symbol: 'AAPL' });
    expect(results.length).toBeGreaterThan(0);
    const aapl = results.find((r) => r.companyName?.includes('APPLE'));
    expect(aapl).toBeDefined();
  });

  it('gets contract details', async () => {
    const results = await client.post<Array<{ conid: number }>>('/iserver/secdef/search', { symbol: 'AAPL' });
    const conid = results[0].conid;
    const details = await client.get(`/iserver/contract/${conid}/info`);
    expect(details).toBeDefined();
  });

  it('gets option strikes for AAPL', async () => {
    const results = await client.post<Array<{ conid: number }>>('/iserver/secdef/search', { symbol: 'AAPL' });
    const conid = results[0].conid;
    // Month is required — use next month
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase() + String(now.getFullYear()).slice(-2);
    const strikes = await client.get<{ call?: number[]; put?: number[] }>('/iserver/secdef/strikes', {
      conid, sectype: 'OPT', month,
    });
    expect(strikes).toBeDefined();
    expect(strikes.call?.length || strikes.put?.length).toBeGreaterThan(0);
  });

  it('gets stock contracts for AAPL', async () => {
    const data = await client.get('/trsrv/stocks', { symbols: 'AAPL' });
    expect(data).toBeDefined();
  });

  it('gets market data snapshot', async () => {
    const results = await client.post<Array<{ conid: number }>>('/iserver/secdef/search', { symbol: 'AAPL' });
    const conid = results[0].conid;

    const data = await client.get('/iserver/marketdata/snapshot', {
      conids: String(conid),
      fields: '31,84,86,87',
    });
    expect(data).toBeDefined();
  }, 15000);

  it('gets P&L', async () => {
    const data = await client.get('/iserver/account/pnl/partitioned');
    expect(data).toBeDefined();
  });

  it('gets live orders', async () => {
    const data = await client.get('/iserver/account/orders');
    expect(data).toBeDefined();
  });

  it('gets trades', async () => {
    const data = await client.get('/iserver/account/trades');
    expect(data).toBeDefined();
  });

  it('gets exchange rate', async () => {
    const data = await client.get('/iserver/exchangerate', { source: 'USD', target: 'EUR' });
    expect(data).toBeDefined();
  });

  it('tickle works', async () => {
    const data = await client.post<{ session?: string }>('/tickle');
    expect(data).toBeDefined();
  });
});
