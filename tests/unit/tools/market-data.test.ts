import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';

describe('Market Data Tools', () => {
  it('get_market_snapshot returns tick data', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getMarketDataSnapshot.mockResolvedValue([
      { tickType: 4, value: 178.52 },  // Last
      { tickType: 1, value: 178.50 },  // Bid
      { tickType: 2, value: 178.54 },  // Ask
      { tickType: 8, value: 52431200 }, // Volume
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, conn);

    const handler = getToolHandler(server, 'get_market_snapshot');

    const result = await handler({ conids: [265598] });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].conId).toBe(265598);
    expect(data[0].tick_4).toBe(178.52);
  });

  it('get_price_history returns bars', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getHistoricalData.mockResolvedValue([
      { time: '1700000000', open: 175.0, high: 178.5, low: 174.5, close: 178.0, volume: 50000 },
      { time: '1700086400', open: 178.0, high: 180.0, low: 177.0, close: 179.5, volume: 45000 },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, conn);

    const handler = getToolHandler(server, 'get_price_history');

    const result = await handler({ conid: 265598, period: '1m', bar: '1d' });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(2);
    expect(data[0].close).toBe(178.0);
  });

  it('get_price_history rejects invalid bar size', async () => {
    const { conn } = createMockConnection();

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, conn);

    const handler = getToolHandler(server, 'get_price_history');

    const result = await handler({ conid: 265598, period: '1m', bar: 'invalid' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid bar size');
  });

  it('get_exchange_rate returns FX data', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getMarketDataSnapshot.mockResolvedValue([
      { tickType: 1, value: 1.0821 },
      { tickType: 2, value: 1.0823 },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, conn);

    const handler = getToolHandler(server, 'get_exchange_rate');

    const result = await handler({ source: 'EUR', target: 'USD' });
    const data = JSON.parse(result.content[0].text);
    expect(data.pair).toBe('EUR/USD');
  });
});
