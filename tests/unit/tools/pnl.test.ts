import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerPnlTools } from '../../../src/tools/pnl.js';

describe('PnL Tools', () => {
  it('get_pnl returns P&L data', async () => {
    const { conn } = createMockConnection();

    (conn.subscribeFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      dailyPnL: 1247.30,
      unrealizedPnL: 5823.50,
      realizedPnL: 312.00,
    });

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPnlTools(server, conn);

    const handler = getToolHandler(server, 'get_pnl');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data.accountId).toBe('U1234567');
    expect(data.dailyPnL).toBe(1247.30);
    expect(data.unrealizedPnL).toBe(5823.50);
    expect(data.realizedPnL).toBe(312.00);
  });
});
