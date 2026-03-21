import { describe, it, expect, vi } from 'vitest';
import positionsFixture from '../fixtures/positions.json';

// Mock IBClient for tool testing
function createMockClient(responses: Record<string, unknown>) {
  return {
    get: vi.fn().mockImplementation((path: string) => {
      for (const [pattern, response] of Object.entries(responses)) {
        if (path.includes(pattern)) return Promise.resolve(response);
      }
      return Promise.resolve({});
    }),
    post: vi.fn().mockResolvedValue({}),
    getDefaultAccountId: vi.fn().mockResolvedValue('U1234567'),
    setOnUnauthorized: vi.fn(),
  };
}

describe('Portfolio tools logic', () => {
  it('auto-paginates positions until empty page', async () => {
    const [page1, page2] = positionsFixture;
    const mockClient = createMockClient({});

    // Simulate pagination: first call returns data, second returns empty
    mockClient.get
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const allPositions: unknown[] = [];
    let pageId = 0;
    while (true) {
      const page = await mockClient.get(`/portfolio/U1234567/positions/${pageId}`);
      if (!page || !Array.isArray(page) || page.length === 0) break;
      allPositions.push(...page);
      pageId++;
    }

    expect(allPositions).toHaveLength(2);
    expect(pageId).toBe(1); // Stopped after empty page
  });

  it('returns both stock and option positions', async () => {
    const [page1] = positionsFixture;

    const stockPositions = (page1 as Array<Record<string, unknown>>).filter((p) => p.assetClass === 'STK');
    const optionPositions = (page1 as Array<Record<string, unknown>>).filter((p) => p.assetClass === 'OPT');

    expect(stockPositions).toHaveLength(1);
    expect(optionPositions).toHaveLength(1);

    // Verify option-specific fields
    const opt = optionPositions[0];
    expect(opt.strike).toBe(180);
    expect(opt.putOrCall).toBe('C');
    expect(opt.expiry).toBe('20250321');
    expect(opt.multiplier).toBe(100);
  });

  it('includes P&L fields in positions', async () => {
    const [page1] = positionsFixture;
    const positions = page1 as Array<Record<string, unknown>>;

    for (const pos of positions) {
      expect(pos).toHaveProperty('unrealizedPnl');
      expect(pos).toHaveProperty('realizedPnl');
      expect(pos).toHaveProperty('mktValue');
      expect(pos).toHaveProperty('avgCost');
    }
  });
});
