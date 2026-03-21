import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerPortfolioTools } from '../../../src/tools/portfolio.js';

describe('Portfolio Tools', () => {
  it('get_positions returns all positions', async () => {
    const { conn } = createMockConnection();

    const positionsData = {
      all: new Map([
        ['U1234567', [
          {
            account: 'U1234567',
            contract: { conId: 265598, symbol: 'AAPL', secType: 'STK', exchange: 'SMART', currency: 'USD' },
            pos: 100,
            avgCost: 150.25,
            marketPrice: 178.50,
            marketValue: 17850,
            unrealizedPNL: 2825,
          },
          {
            account: 'U1234567',
            contract: {
              conId: 500000, symbol: 'AAPL', secType: 'OPT', exchange: 'SMART', currency: 'USD',
              strike: 180, right: 'C', lastTradeDateOrContractMonth: '20250321', multiplier: 100,
            },
            pos: 5,
            avgCost: 3.20,
          },
        ]],
      ]),
    };

    (conn.subscribeFirst as ReturnType<typeof vi.fn>).mockResolvedValue(positionsData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPortfolioTools(server, conn);

    const handler = getToolHandler(server, 'get_positions');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(2);
    expect(data.positions[0].symbol).toBe('AAPL');
    expect(data.positions[0].secType).toBe('STK');
    expect(data.positions[0].position).toBe(100);
    // Option position should have strike/right
    expect(data.positions[1].strike).toBe(180);
    expect(data.positions[1].right).toBe('C');
  });

  it('get_positions filters by account', async () => {
    const { conn } = createMockConnection();

    const positionsData = {
      all: new Map([
        ['U1234567', [
          { account: 'U1234567', contract: { conId: 1, symbol: 'AAPL', secType: 'STK' }, pos: 100, avgCost: 150 },
        ]],
        ['U7654321', [
          { account: 'U7654321', contract: { conId: 2, symbol: 'MSFT', secType: 'STK' }, pos: 50, avgCost: 300 },
        ]],
      ]),
    };

    (conn.subscribeFirst as ReturnType<typeof vi.fn>).mockResolvedValue(positionsData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPortfolioTools(server, conn);

    const handler = getToolHandler(server, 'get_positions');

    const result = await handler({ accountId: 'U7654321' });
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(1);
    expect(data.positions[0].symbol).toBe('MSFT');
  });
});
