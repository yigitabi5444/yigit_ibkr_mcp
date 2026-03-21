import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerOrdersTradesTools } from '../../../src/tools/orders-trades.js';

describe('Orders & Trades Tools', () => {
  it('get_live_orders returns open orders', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getAllOpenOrders.mockResolvedValue([
      {
        contract: { conId: 265598, symbol: 'AAPL', secType: 'STK' },
        order: { orderId: 1, action: 'BUY', totalQuantity: 100, orderType: 'LMT', lmtPrice: 175 },
        orderState: { status: 'Submitted' },
      },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, conn);

    const handler = getToolHandler(server, 'get_live_orders');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].order.orderId).toBe(1);
  });

  it('get_trades returns executions', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getExecutionDetails.mockResolvedValue([
      {
        contract: { conId: 265598, symbol: 'AAPL' },
        execution: { execId: 'exec1', time: '20250320 14:30:00', side: 'BOT', shares: 100, price: 175.50 },
      },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, conn);

    const handler = getToolHandler(server, 'get_trades');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].execution.price).toBe(175.50);
  });

  it('get_order_status finds matching order', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getAllOpenOrders.mockResolvedValue([
      { order: { orderId: 1 }, contract: { symbol: 'AAPL' }, orderState: { status: 'Submitted' } },
      { order: { orderId: 2 }, contract: { symbol: 'MSFT' }, orderState: { status: 'Filled' } },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, conn);

    const handler = getToolHandler(server, 'get_order_status');

    const result = await handler({ orderId: 2 });
    const data = JSON.parse(result.content[0].text);
    expect(data.contract.symbol).toBe('MSFT');
  });
});
