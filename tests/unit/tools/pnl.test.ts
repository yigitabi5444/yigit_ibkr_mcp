import { describe, it, expect } from 'vitest';
import pnlFixture from '../fixtures/pnl.json';

describe('P&L tools logic', () => {
  it('PnL fixture has expected fields', () => {
    const accountPnl = pnlFixture['U1234567'];
    expect(accountPnl).toBeDefined();
    expect(accountPnl.dpl).toBeDefined(); // Daily P&L
    expect(accountPnl.upl).toBeDefined(); // Unrealized P&L
    expect(accountPnl.nl).toBeDefined();  // Net Liquidity
    expect(accountPnl.el).toBeDefined();  // Excess Liquidity
    expect(accountPnl.mv).toBeDefined();  // Market Value
  });

  it('PnL values are numeric', () => {
    const accountPnl = pnlFixture['U1234567'];
    expect(typeof accountPnl.dpl).toBe('number');
    expect(typeof accountPnl.upl).toBe('number');
    expect(typeof accountPnl.nl).toBe('number');
    expect(typeof accountPnl.el).toBe('number');
  });
});
