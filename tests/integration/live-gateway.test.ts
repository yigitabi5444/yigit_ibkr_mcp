import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { IBConnection } from '../../src/connection.js';

const IBKR_HOST = process.env.IBKR_HOST;

// Skip entire suite if no host is configured
const describeIf = IBKR_HOST ? describe : describe.skip;

describeIf('Live IB Gateway Integration', () => {
  let conn: IBConnection;
  let accountId: string;

  beforeAll(async () => {
    const config = loadConfig();
    conn = new IBConnection(config);
    await conn.connect();
    accountId = await conn.getAccountId();
  }, 30000);

  afterAll(() => {
    conn?.disconnect();
  });

  it('connects and resolves account', () => {
    expect(conn.isConnected).toBe(true);
    expect(accountId).toBeDefined();
    expect(accountId.length).toBeGreaterThan(0);
  });

  it('gets managed accounts', async () => {
    const accounts = await conn.ib.getManagedAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts).toContain(accountId);
  });

  it('gets account summary', async () => {
    const summary = await conn.subscribeFirst(
      conn.ib.getAccountSummary('All', 'NetLiquidation,TotalCashValue,BuyingPower'),
    );
    expect(summary).toBeDefined();
    expect(summary.all).toBeDefined();
    // Should have at least one account
    expect(summary.all.size).toBeGreaterThan(0);
  });

  it('gets positions', async () => {
    const positions = await conn.subscribeFirst(conn.ib.getPositions());
    expect(positions).toBeDefined();
    expect(positions.all).toBeDefined();
    // positions.all is a Map<AccountId, Position[]>
    // May be empty if no positions, but should not throw
  });

  it('gets P&L', async () => {
    const pnl = await conn.subscribeFirst(conn.ib.getPnL(accountId, ''));
    expect(pnl).toBeDefined();
    // PnL should have at least one of these fields
    expect(
      pnl.dailyPnL !== undefined ||
      pnl.unrealizedPnL !== undefined ||
      pnl.realizedPnL !== undefined,
    ).toBe(true);
  });

  it('searches for AAPL', async () => {
    const results = await conn.ib.getMatchingSymbols('AAPL');
    expect(results.length).toBeGreaterThan(0);
    const aapl = results.find((r) => r.contract?.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl!.contract?.conId).toBeDefined();
  });

  it('gets contract details for AAPL', async () => {
    const results = await conn.ib.getMatchingSymbols('AAPL');
    const aapl = results.find((r) => r.contract?.symbol === 'AAPL' && r.contract?.secType === 'STK');
    expect(aapl).toBeDefined();

    const details = await conn.ib.getContractDetails({ conId: aapl!.contract!.conId } as never);
    expect(details.length).toBeGreaterThan(0);
    expect(details[0].longName).toBeDefined();
  });

  it('gets market data snapshot', async () => {
    const { Stock } = await import('@stoqey/ib');
    const contract = new Stock('AAPL', 'SMART', 'USD');
    const ticks = await conn.ib.getMarketDataSnapshot(contract, '', false);
    expect(ticks).toBeDefined();
    // May be empty on first call (warmup), but should not throw
  });

  it('gets historical data for AAPL', async () => {
    const { BarSizeSetting, WhatToShow, Stock } = await import('@stoqey/ib');
    const contract = new Stock('AAPL', 'SMART', 'USD');
    const bars = await conn.ib.getHistoricalData(
      contract,
      '',
      '5 D',
      BarSizeSetting.DAYS_ONE,
      WhatToShow.TRADES,
      1,
      2,
    );
    expect(Array.isArray(bars)).toBe(true);
    expect(bars.length).toBeGreaterThan(0);
    expect(bars[0]).toHaveProperty('open');
    expect(bars[0]).toHaveProperty('close');
    expect(bars[0]).toHaveProperty('volume');
  });

  it('gets option chain params for AAPL', async () => {
    const { SecType } = await import('@stoqey/ib');
    const params = await conn.ib.getSecDefOptParams('AAPL', '', SecType.STK, 265598);
    expect(params.length).toBeGreaterThan(0);
    expect(params[0].expirations.length).toBeGreaterThan(0);
    expect(params[0].strikes.length).toBeGreaterThan(0);
  });

  it('gets scanner parameters', async () => {
    const xml = await conn.ib.getScannerParameters();
    expect(xml).toBeDefined();
    expect(xml.length).toBeGreaterThan(0);
    // Should be XML
    expect(xml).toContain('<?xml');
  });

  it('gets open orders', async () => {
    const orders = await conn.ib.getAllOpenOrders();
    expect(orders).toBeDefined();
    // May be empty, but should not throw
  });

  it('gets execution details', async () => {
    const executions = await conn.ib.getExecutionDetails({} as never);
    expect(executions).toBeDefined();
    // May be empty if no trades today
  });

  it('gets exchange rate EUR/USD', async () => {
    const { SecType } = await import('@stoqey/ib');
    const contract = {
      symbol: 'EUR',
      secType: SecType.CASH,
      currency: 'USD',
      exchange: 'IDEALPRO',
    } as never;
    const ticks = await conn.ib.getMarketDataSnapshot(contract, '', false);
    expect(ticks).toBeDefined();
  });
});
