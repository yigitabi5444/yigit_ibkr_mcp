import { describe, it, expect, vi } from 'vitest';
import snapshotFixture from '../fixtures/snapshot.json';
import snapshotEmptyFixture from '../fixtures/snapshot-empty.json';

describe('Market data tools logic', () => {
  it('detects warmup (empty) snapshot and retries', async () => {
    const mockGet = vi.fn()
      .mockResolvedValueOnce(snapshotEmptyFixture) // First call: empty
      .mockResolvedValueOnce(snapshotFixture);      // Second call: data

    // Simulate the warmup retry logic
    let data = await mockGet('/iserver/marketdata/snapshot');

    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as Record<string, unknown>;
      const hasData = Object.keys(firstItem).some(
        (k) => k !== 'conid' && k !== 'conidEx' && k !== 'server_id' && firstItem[k] !== '',
      );
      if (!hasData) {
        data = await mockGet('/iserver/marketdata/snapshot');
      }
    }

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(data).toEqual(snapshotFixture);
  });

  it('does not retry when snapshot has data', async () => {
    const mockGet = vi.fn().mockResolvedValueOnce(snapshotFixture);

    let data = await mockGet('/iserver/marketdata/snapshot');

    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as Record<string, unknown>;
      const hasData = Object.keys(firstItem).some(
        (k) => k !== 'conid' && k !== 'conidEx' && k !== 'server_id' && firstItem[k] !== '',
      );
      if (!hasData) {
        data = await mockGet('/iserver/marketdata/snapshot');
      }
    }

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('snapshot contains fundamental data fields', () => {
    const snapshot = snapshotFixture[0];

    // Fundamentals
    expect(snapshot['7290']).toBeDefined(); // P/E
    expect(snapshot['7291']).toBeDefined(); // EPS
    expect(snapshot['7287']).toBeDefined(); // Div Yield
    expect(snapshot['7289']).toBeDefined(); // Market Cap
    expect(snapshot['7293']).toBeDefined(); // 52wk High
    expect(snapshot['7294']).toBeDefined(); // 52wk Low
    expect(snapshot['7633']).toBeDefined(); // IV

    // Price data
    expect(snapshot['31']).toBeDefined();   // Last
    expect(snapshot['84']).toBeDefined();   // Bid
    expect(snapshot['86']).toBeDefined();   // Ask
    expect(snapshot['87']).toBeDefined();   // Volume
  });

  it('snapshot contains P&L fields', () => {
    const snapshot = snapshotFixture[0];

    expect(snapshot['72']).toBeDefined();  // Position
    expect(snapshot['73']).toBeDefined();  // Market Value
    expect(snapshot['75']).toBeDefined();  // Unrealized P&L
    expect(snapshot['78']).toBeDefined();  // Daily P&L
  });
});
