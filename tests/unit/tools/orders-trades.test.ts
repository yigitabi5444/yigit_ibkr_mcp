import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerOrdersTradesTools } from '../../../src/tools/orders-trades.js';

describe('Orders & Trades Tools', () => {
  it('get_live_orders returns orders array', async () => {
    const { client } = createMockClient();
    const ordersData = {
      orders: [
        { orderId: 101, symbol: 'AAPL', side: 'BUY', orderType: 'LMT', price: 170.0, quantity: 10, status: 'PreSubmitted' },
        { orderId: 102, symbol: 'MSFT', side: 'SELL', orderType: 'MKT', quantity: 5, status: 'Submitted' },
      ],
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(ordersData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, client);

    const handler = getToolHandler(server, 'get_live_orders');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.orders).toHaveLength(2);
    expect(data.orders[0].orderId).toBe(101);
    expect(client.get).toHaveBeenCalledWith('/iserver/account/orders');
  });

  it('get_trades returns trades array', async () => {
    const { client } = createMockClient();
    const tradesData = [
      { execution_id: 'exec1', symbol: 'AAPL', side: 'BOT', size: 100, price: 175.0, commission: 1.0 },
      { execution_id: 'exec2', symbol: 'TSLA', side: 'SLD', size: 50, price: 250.0, commission: 1.0 },
    ];
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(tradesData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, client);

    const handler = getToolHandler(server, 'get_trades');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data).toHaveLength(2);
    expect(data[0].symbol).toBe('AAPL');
    expect(data[1].side).toBe('SLD');
    expect(client.get).toHaveBeenCalledWith('/iserver/account/trades');
  });

  it('get_live_orders returns error on failure', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Gateway timeout'));

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOrdersTradesTools(server, client);

    const handler = getToolHandler(server, 'get_live_orders');
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Gateway timeout');
  });
});
