import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerOrdersTradesTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_live_orders', {
    title: 'Get Live Orders',
    description: 'List all currently live/working orders across all accounts. Rate-limited to 1 request per 5 seconds.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const data = await client.get('/iserver/account/orders');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_order_status', {
    title: 'Get Order Status',
    description: 'Get detailed status of a specific order by order ID.',
    inputSchema: {
      orderId: z.string().describe('Order ID to check status for'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ orderId }) => {
    try {
      const data = await client.get(`/iserver/account/order/status/${orderId}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_trades', {
    title: 'Get Trades',
    description: 'Get trade execution history for the current day plus 6 previous days. Rate-limited to 1 request per 5 seconds.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const data = await client.get('/iserver/account/trades');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
