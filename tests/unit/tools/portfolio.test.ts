import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerPortfolioTools } from '../../../src/tools/portfolio.js';

describe('Portfolio Tools', () => {
  it('get_positions auto-paginates through all pages', async () => {
    const { client } = createMockClient();
    const page0 = [
      { conid: 265598, symbol: 'AAPL', position: 100, mktValue: 17500 },
      { conid: 272093, symbol: 'MSFT', position: 50, mktValue: 21000 },
    ];
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(page0)   // page 0
      .mockResolvedValueOnce([]);      // page 1 — empty, stops pagination

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPortfolioTools(server, client);

    const handler = getToolHandler(server, 'get_positions');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(2);
    expect(data.positions).toHaveLength(2);
    expect(data.positions[0].symbol).toBe('AAPL');
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('get_positions handles multi-page results', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ conid: 1, symbol: 'A' }])
      .mockResolvedValueOnce([{ conid: 2, symbol: 'B' }])
      .mockResolvedValueOnce([]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPortfolioTools(server, client);

    const handler = getToolHandler(server, 'get_positions');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(2);
    expect(client.get).toHaveBeenCalledTimes(3);
  });

  it('get_position_by_conid returns single position', async () => {
    const { client } = createMockClient();
    const position = { conid: 265598, symbol: 'AAPL', position: 100, avgCost: 150.25 };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(position);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPortfolioTools(server, client);

    const handler = getToolHandler(server, 'get_position_by_conid');
    const result = await handler({ conid: 265598 });
    const data = JSON.parse(result.content[0].text);

    expect(data.conid).toBe(265598);
    expect(data.symbol).toBe('AAPL');
    expect(client.get).toHaveBeenCalledWith('/portfolio/U1234567/position/265598');
  });
});
