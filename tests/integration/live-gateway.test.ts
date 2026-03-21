import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { RateLimiter } from '../../src/client/rate-limiter.js';
import { IBClient } from '../../src/client/ib-client.js';
import { SessionManager } from '../../src/client/session-manager.js';

const GATEWAY_URL = process.env.IBKR_GATEWAY_URL;

// Skip entire suite if no gateway URL is configured
const describeIf = GATEWAY_URL ? describe : describe.skip;

describeIf('Live IB Gateway Integration', () => {
  let client: IBClient;
  let sessionManager: SessionManager;
  let accountId: string;

  beforeAll(async () => {
    const config = loadConfig();
    const rateLimiter = new RateLimiter();
    client = new IBClient(config, rateLimiter);
    sessionManager = new SessionManager(client, config.tickleIntervalMs);
    await sessionManager.start();
  });

  afterAll(() => {
    sessionManager?.stop();
  });

  it('authenticates successfully', async () => {
    const status = await sessionManager.checkAuthStatus();
    expect(status.authenticated).toBe(true);
  });

  it('lists accounts', async () => {
    const data = await client.get<{ accounts?: string[] }>('/iserver/accounts');
    expect(data.accounts).toBeDefined();
    expect(data.accounts!.length).toBeGreaterThan(0);
    accountId = data.accounts![0];
  });

  it('gets account summary', async () => {
    const id = accountId || await client.getDefaultAccountId();
    const summary = await client.get<Record<string, unknown>>(`/portfolio/${id}/summary`);
    expect(summary).toBeDefined();
    // Should have key balance fields
    expect(summary).toHaveProperty('totalcashvalue');
  });

  it('gets account ledger', async () => {
    const id = accountId || await client.getDefaultAccountId();
    const ledger = await client.get<Record<string, unknown>>(`/portfolio/${id}/ledger`);
    expect(ledger).toBeDefined();
  });

  it('gets positions', async () => {
    const id = accountId || await client.getDefaultAccountId();
    const positions = await client.get<unknown[]>(`/portfolio/${id}/positions/0`);
    expect(Array.isArray(positions)).toBe(true);

    if (positions.length > 0) {
      const pos = positions[0] as Record<string, unknown>;
      expect(pos).toHaveProperty('conid');
      expect(pos).toHaveProperty('position');
      expect(pos).toHaveProperty('mktValue');
      expect(pos).toHaveProperty('unrealizedPnl');
      expect(pos).toHaveProperty('avgCost');
    }
  });

  it('searches for AAPL contract', async () => {
    const results = await client.post<Array<{ conid: number; symbol: string }>>('/iserver/secdef/search', {
      symbol: 'AAPL',
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('conid');
  });

  it('gets market snapshot with fundamentals', async () => {
    // Use AAPL conid (265598 is typically AAPL on NASDAQ)
    const fields = '31,84,86,87,7290,7291,7287,7289,7293,7294,7633';
    const params = { conids: '265598', fields };

    // First call may be warmup
    await client.get('/iserver/marketdata/snapshot', params);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const data = await client.get<Array<Record<string, unknown>>>('/iserver/marketdata/snapshot', params);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const snapshot = data[0];
    expect(snapshot).toHaveProperty('conid');
    // At least some fields should be populated
    const populatedFields = Object.keys(snapshot).filter(
      (k) => k !== 'conid' && k !== 'conidEx' && k !== 'server_id',
    );
    expect(populatedFields.length).toBeGreaterThan(0);
  });

  it('gets option strikes for AAPL', async () => {
    const data = await client.get<{ call?: number[]; put?: number[] }>('/iserver/secdef/strikes', {
      conid: 265598,
      sectype: 'OPT',
    });
    expect(data).toBeDefined();
    // Should have call or put strikes
    expect(data.call?.length || data.put?.length).toBeGreaterThan(0);
  });

  it('gets P&L data', async () => {
    const data = await client.get<Record<string, unknown>>('/iserver/account/pnl/partitioned');
    expect(data).toBeDefined();
  });

  it('gets trades', async () => {
    const data = await client.get<unknown[]>('/iserver/account/trades');
    expect(Array.isArray(data)).toBe(true);
  });

  it('session stays alive with tickle', async () => {
    // Wait 2 seconds and verify session is still active
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const status = await sessionManager.checkAuthStatus();
    expect(status.authenticated).toBe(true);
  });
});
