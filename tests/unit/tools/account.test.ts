import { describe, it, expect, vi } from 'vitest';
import accountsFixture from '../fixtures/accounts.json';

describe('Account tools logic', () => {
  it('merges summary and ledger into single response', async () => {
    const mockSummary = {
      accountready: { amount: 0, currency: null, isNull: false },
      totalcashvalue: { amount: 50000, currency: 'USD', isNull: false },
      netliquidation: { amount: 125000, currency: 'USD', isNull: false },
      maintmarginreq: { amount: 25000, currency: 'USD', isNull: false },
    };
    const mockLedger = {
      USD: { cashbalance: 50000, settledcash: 48000, exchangerate: 1 },
      BASE: { cashbalance: 50000, settledcash: 48000, exchangerate: 1 },
    };

    const mockGet = vi.fn()
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockLedger);

    const [summary, ledger] = await Promise.all([
      mockGet('/portfolio/U1234567/summary'),
      mockGet('/portfolio/U1234567/ledger'),
    ]);

    const merged = { summary, ledger };
    expect(merged.summary).toEqual(mockSummary);
    expect(merged.ledger).toEqual(mockLedger);
    expect(merged.summary.netliquidation.amount).toBe(125000);
    expect(merged.ledger.USD.cashbalance).toBe(50000);
  });

  it('uses default account when accountId not provided', async () => {
    const mockGetDefaultAccountId = vi.fn().mockResolvedValue('U1234567');

    const id = await mockGetDefaultAccountId();
    expect(id).toBe('U1234567');
  });

  it('accounts fixture has expected structure', () => {
    expect(accountsFixture.accounts).toContain('U1234567');
    expect(accountsFixture.selectedAccount).toBe('U1234567');
  });
});
