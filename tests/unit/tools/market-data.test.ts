import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';

describe('Market Data Tools', () => {
  it('get_market_snapshot returns field data and passes conids', async () => {
    const { client, sessionManager } = createMockClient();
    const snapshot = [
      { conid: 265598, '31': '175.50', '84': '175.40', '85': '175.60', '86': '175.80' },
    ];
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(snapshot);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_market_snapshot');
    const result = await handler({ conids: [265598] });
    const data = JSON.parse(result.content[0].text);

    expect(data[0].conid).toBe(265598);
    expect(data[0]['31']).toBe('175.50');
    expect(client.get).toHaveBeenCalledWith(
      '/iserver/marketdata/snapshot',
      expect.objectContaining({ conids: '265598' }),
    );
  });

  it('get_market_snapshot retries on warmup (empty first response)', async () => {
    const { client, sessionManager } = createMockClient();
    const emptySnapshot = [{ conid: 265598, conidEx: '265598', server_id: 'abc' }];
    const fullSnapshot = [{ conid: 265598, '31': '175.50', '84': '175.40' }];

    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(emptySnapshot)
      .mockResolvedValueOnce(fullSnapshot);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_market_snapshot');
    const result = await handler({ conids: [265598] });
    const data = JSON.parse(result.content[0].text);

    expect(data[0]['31']).toBe('175.50');
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('get_price_history returns OHLCV bars', async () => {
    const { client, sessionManager } = createMockClient();
    const history = {
      symbol: 'AAPL',
      data: [
        { o: 174.0, h: 176.5, l: 173.5, c: 175.5, v: 5000000, t: 1700000000 },
        { o: 175.5, h: 177.0, l: 175.0, c: 176.0, v: 4500000, t: 1700086400 },
      ],
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(history);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerMarketDataTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_price_history');
    const result = await handler({ conid: 265598, period: '1m', bar: '1d' });
    const data = JSON.parse(result.content[0].text);

    expect(data.symbol).toBe('AAPL');
    expect(data.data).toHaveLength(2);
    expect(data.data[0].o).toBe(174.0);
    expect(sessionManager.ensureBrokerageSession).toHaveBeenCalled();
  });
});
