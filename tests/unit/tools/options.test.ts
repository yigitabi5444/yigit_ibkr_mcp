import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerOptionsTools } from '../../../src/tools/options.js';

describe('Options Tools', () => {
  it('get_option_chain returns expirations and strikes', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getSecDefOptParams.mockResolvedValue([
      {
        exchange: 'SMART',
        underlyingConId: 265598,
        tradingClass: 'AAPL',
        multiplier: 100,
        expirations: ['20250321', '20250418', '20250516'],
        strikes: [170, 175, 180, 185, 190],
      },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, conn);

    const handler = getToolHandler(server, 'get_option_chain');

    const result = await handler({ symbol: 'AAPL', conid: 265598 });
    const data = JSON.parse(result.content[0].text);
    expect(data.underlying).toBe('AAPL');
    expect(data.chains).toHaveLength(1);
    expect(data.chains[0].expirations).toHaveLength(3);
    expect(data.chains[0].strikes).toEqual([170, 175, 180, 185, 190]);
    expect(data.chains[0].multiplier).toBe(100);
  });

  it('get_option_chain filters by exchange', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getSecDefOptParams.mockResolvedValue([
      { exchange: 'SMART', underlyingConId: 265598, tradingClass: 'AAPL', multiplier: 100, expirations: ['20250321'], strikes: [180] },
      { exchange: 'CBOE', underlyingConId: 265598, tradingClass: 'AAPL', multiplier: 100, expirations: ['20250321'], strikes: [180] },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, conn);

    const handler = getToolHandler(server, 'get_option_chain');

    const result = await handler({ symbol: 'AAPL', conid: 265598, exchange: 'SMART' });
    const data = JSON.parse(result.content[0].text);
    expect(data.chains).toHaveLength(1);
    expect(data.chains[0].exchange).toBe('SMART');
  });
});
